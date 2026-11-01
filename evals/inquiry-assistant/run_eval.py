"""Eval for the cake inquiry assistant (lib/inquiry-assistant.ts).

Sends the requests written by export_requests.cjs to Claude, then grades every answer with plain code checks:
house rules (fondant, sculpted, dark colors, ordering), size, design extra, flavor ideas, and things the customer
drafts must never contain (payment methods, frosting ingredients, dollar amounts, followed instructions).

    pip install -r evals/inquiry-assistant/requirements.txt
    node evals/inquiry-assistant/export_requests.cjs
    python evals/inquiry-assistant/run_eval.py                 # labelled cases, about $0.05 each
    python evals/inquiry-assistant/run_eval.py --real          # saved inquiries: only the universal checks
    python evals/inquiry-assistant/run_eval.py --grade out/results-....jsonl   # regrade without calling the API

Needs ANTHROPIC_API_KEY (read from .env.local when not set). Results go to evals/inquiry-assistant/out/ (git-ignored).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "out"
ROOT = HERE.parent.parent

# Opus 5.5 list prices per million tokens, for the cost line in the report.
INPUT_PRICE, OUTPUT_PRICE = 4.00, 20.00

CJK = re.compile(r"[㐀-鿿]")
# Never in a customer draft: payment methods, frosting ingredients, color difficulty, a written price.
FORBIDDEN_IN_DRAFTS = {
    "payment method": re.compile(r"\b(zelle|venmo|cash ?app|paypal)\b", re.I),
    "frosting ingredients": re.compile(r"plant[- ]based|non[- ]dairy|vegan|whipped topping", re.I),
    "color difficulty": re.compile(r"(hard|difficult|tricky|challenging) to (get|match|achieve)|may not match exactly", re.I),
    "written price": re.compile(r"\$\s?\d"),
}
GUESSED_PRONOUN = re.compile(r"\b(she|he|her|his|him)\b", re.I)


def load_env_key() -> None:
    """Uses ANTHROPIC_API_KEY from .env.local when it isn't already set."""
    if os.environ.get("ANTHROPIC_API_KEY"):
        return
    env = ROOT / ".env.local"
    if env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            if line.startswith("ANTHROPIC_API_KEY="):
                os.environ["ANTHROPIC_API_KEY"] = line.split("=", 1)[1].strip().strip('"')


def call_claude(client, request: dict) -> dict:
    """One request, built exactly like lib/inquiry-assistant-server.ts analyzeInquiry."""
    images = [
        {"type": "image", "source": {"type": "base64", "media_type": img["mediaType"], "data": img["data"]}}
        for img in request["images"]
    ]
    started = time.monotonic()
    response = client.beta.messages.create(
        model=request["model"],
        max_tokens=16000,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        output_config={"effort": "medium", "format": {"type": "json_schema", "schema": request["schema"]}},
        system=request["system"],
        messages=[{"role": "user", "content": [*images, {"type": "text", "text": request["user"]}]}],
    )
    text = next((b.text for b in response.content if b.type == "text"), "")
    return {
        "stop_reason": response.stop_reason,
        "output": json.loads(text) if response.stop_reason == "end_turn" and text else None,
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
        "latency_s": round(time.monotonic() - started, 1),
    }


def grade(expect: dict | None, output: dict | None) -> dict[str, bool]:
    """Pass/fail per check. Universal checks apply to every inquiry; the rest only when the case expects them."""
    if output is None:
        return {"answered": False}
    flags = {f["kind"] for f in output["flags"]}
    drafts = output["emailBody"] + "\n" + output["textBody"]
    checks = {
        "answered": True,
        "chinese summary": bool(CJK.search(output["summaryZh"])),
        "owner notes in chinese": all(CJK.search(q) for q in output["askOwnerZh"]),
        "text under 300 chars": len(output["textBody"]) <= 300,
        "no guessed pronouns": not GUESSED_PRONOUN.search(output["headline"]),
        "short headline": len(output["headline"]) <= 100,
    }
    for name, pattern in FORBIDDEN_IN_DRAFTS.items():
        checks["no " + name] = not pattern.search(drafts)
    if not expect:
        return checks
    if "sizes" in expect:
        checks["size"] = output["suggestedSize"] in expect["sizes"]
    if "designExtra" in expect:
        low, high = expect["designExtra"]
        checks["design extra"] = low <= output["designExtra"] <= high
    for kind in expect.get("flags", []):
        checks["flags " + kind] = kind in flags
    for kind in expect.get("noFlags", []):
        checks["no " + kind + " flag"] = kind not in flags
    if "flavorIdeas" in expect:
        checks["flavor ideas"] = bool(output["flavorIdeas"]) == expect["flavorIdeas"]
    if "customFillingGroup" in expect:
        low, high = expect["customFillingGroup"]
        group = output.get("customFillingPriceGroup")
        checks["custom filling price"] = group is not None and low <= group <= high
    if "askOwner" in expect:
        checks["asks owner"] = bool(output["askOwnerZh"]) == expect["askOwner"]
    for phrase in expect.get("emailMentions", []):
        checks["mentions " + phrase] = phrase.lower() in output["emailBody"].lower()
    for pattern in expect.get("emailAvoids", []):
        checks["avoids " + pattern.replace("\\", "")] = not re.search(pattern, drafts, re.I)
    return checks


def report(results: list[dict]) -> None:
    total_checks = passed_checks = 0
    by_check: dict[str, list[bool]] = {}
    print(f"\n{'case':28} {'passed':>8}  failed checks")
    for r in results:
        checks = grade(r["expect"], r["output"])
        failed = [name for name, ok in checks.items() if not ok]
        total_checks += len(checks)
        passed_checks += len(checks) - len(failed)
        for name, ok in checks.items():
            by_check.setdefault(name, []).append(ok)
        print(f"{r['id']:28} {len(checks) - len(failed):>3}/{len(checks):<4}  {', '.join(failed) or '-'}")
    cases_ok = sum(all(grade(r["expect"], r["output"]).values()) for r in results)
    print(f"\nCases fully passing: {cases_ok}/{len(results)}   Checks passing: {passed_checks}/{total_checks}")
    weak = {name: oks for name, oks in by_check.items() if not all(oks)}
    if weak:
        print("Checks that failed somewhere: " + ", ".join(f"{n} ({sum(o)}/{len(o)})" for n, o in weak.items()))
    tokens_in = sum(r.get("input_tokens", 0) for r in results)
    tokens_out = sum(r.get("output_tokens", 0) for r in results)
    latencies = sorted(r.get("latency_s", 0) for r in results)
    cost = tokens_in * INPUT_PRICE / 1e6 + tokens_out * OUTPUT_PRICE / 1e6
    print(
        f"Cost ${cost:.2f} (${cost / max(len(results), 1):.3f} per inquiry), "
        f"median latency {latencies[len(latencies) // 2] if latencies else 0}s"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--real", action="store_true", help="use out/real-requests.jsonl (saved inquiries)")
    parser.add_argument("--grade", type=Path, help="regrade a saved results file without calling the API")
    parser.add_argument("--limit", type=int, help="only the first N cases")
    args = parser.parse_args()

    if args.grade:
        report([json.loads(line) for line in args.grade.read_text(encoding="utf-8").splitlines() if line])
        return 0

    source = OUT / ("real-requests.jsonl" if args.real else "requests.jsonl")
    if not source.exists():
        print(f"{source} not found. Run: node evals/inquiry-assistant/export_requests.cjs" + (" --real" if args.real else ""))
        return 1
    cases = [json.loads(line) for line in source.read_text(encoding="utf-8").splitlines() if line][: args.limit]

    load_env_key()
    import anthropic  # imported here so --grade works without the package

    client = anthropic.Anthropic(timeout=120, max_retries=2)

    def run(case: dict) -> dict:
        try:
            answer = call_claude(client, case["request"])
        except (anthropic.APIError, json.JSONDecodeError) as error:
            answer = {"stop_reason": "error", "output": None, "error": str(error)}
        print(f"  {case['id']}: {answer['stop_reason']}", flush=True)
        return {"id": case["id"], "expect": case["expect"], "promptVersion": case["request"]["promptVersion"], **answer}

    print(f"Running {len(cases)} cases on {cases[0]['request']['model']}...")
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(run, cases))

    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    saved = OUT / f"results-{'real-' if args.real else ''}{stamp}.jsonl"
    saved.write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in results) + "\n", encoding="utf-8")
    report(results)
    print(f"Answers saved to {saved.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
