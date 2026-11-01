'use client'
import { useState } from 'react'
import type { StoredCakeInquiry } from '@/lib/cake-inquiry'
import { cakeLabel } from '@/lib/cake-catalog'
import {
  askOwnerText,
  codeChecks,
  emailDraft,
  quoteFor,
  textDraft,
  type AssistantNote,
  type FlagKind,
} from '@/lib/inquiry-assistant'
import { Button } from './ui/button'

const flagLabels: Record<FlagKind, string> = {
  fondant: 'Fondant',
  needs_ordering: 'Needs ordering',
  dark_colors: 'Dark colors',
  sculpted: 'Sculpted',
  design_complex: 'Complex design',
  unusual_request: 'Unusual request',
}

/** AI notes on an inquiry card: summary, estimate, checks, questions and reply drafts to copy. */
export function AdminInquiryAssistant({
  inquiry: i,
  note,
  signer,
}: {
  inquiry: StoredCakeInquiry
  note: AssistantNote
  signer: string
}) {
  const [copied, setCopied] = useState('')
  const { output } = note
  const quote = quoteFor(i, output)
  const checks = codeChecks(i, output, quote)
  const email = emailDraft(i, note, signer)
  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(c => (c === label ? '' : c)), 2000)
    } catch {
      setCopied('')
    }
  }
  const price = (n: number | null) => (n === null ? 'to quote' : `$${n}`)

  return (
    <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-2">
      <p>
        <span className="text-xs font-semibold uppercase text-primary">AI notes · </span>
        <span className="font-semibold">{output.headline}</span>
      </p>
      <p>
        <span className="font-semibold">Estimate {price(quote.total)}</span>
        <span className="text-muted-foreground">
          {' '}
          = {cakeLabel(quote.size)} {quote.baseIsFrom ? 'from ' : ''}
          {price(quote.base)} + design ${quote.designExtra}
          {quote.designExtra > 0 && ` (${output.designExtraReason})`} + delivery {price(quote.delivery)}
        </span>
      </p>
      {i.size !== 'Not sure' && output.suggestedSize !== i.size && (
        <p className="text-muted-foreground">
          Suggests {cakeLabel(output.suggestedSize)}: {output.sizeReason}
        </p>
      )}
      {output.flavorIdeas.length > 0 && (
        <ul className="list-disc pl-5">
          {output.flavorIdeas.map(idea => (
            <li key={idea.flavor + idea.filling}>
              {idea.flavor} / {idea.filling}: <span className="text-muted-foreground">{idea.why}</span>
            </li>
          ))}
        </ul>
      )}
      {(checks.length > 0 || output.flags.length > 0) && (
        <ul className="space-y-0.5 rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-900">
          {checks.map(c => (
            <li key={c}>{c}</li>
          ))}
          {output.flags.map(f => (
            <li key={f.kind + f.note}>
              <span className="font-semibold">{flagLabels[f.kind]}:</span> {f.note}
            </li>
          ))}
        </ul>
      )}
      {output.questions.length > 0 && (
        <div>
          <p className="font-semibold">To ask the customer</p>
          <ul className="list-disc pl-5">
            {output.questions.map(q => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      )}
      <details>
        <summary className="cursor-pointer font-semibold">Email draft</summary>
        <p className="mt-1 whitespace-pre-wrap rounded-md bg-card p-2">{email}</p>
      </details>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => copy('email', email)}>
          {copied === 'email' ? 'Copied' : 'Copy email'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => copy('text', textDraft(i, note, signer))}>
          {copied === 'text' ? 'Copied' : 'Copy text'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => copy('owner', askOwnerText(i, note))}>
          {copied === 'owner' ? 'Copied' : 'Ask owner'}
        </Button>
      </div>
    </div>
  )
}
