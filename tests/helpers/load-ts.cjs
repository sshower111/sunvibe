'use strict'
/**
 * Loads the app's TypeScript modules in plain Node so unit tests run without a build.
 *
 * - Files are transpiled on the fly with the project's TypeScript compiler.
 * - `@/…` and relative imports resolve to project files (.ts, .tsx, /index.ts).
 * - `server-only` resolves to an empty module.
 * - Any import can be replaced with a test double through `mocks`, keyed by the exact
 *   specifier used in the source (e.g. '@/lib/turnstile', 'resend', 'next/headers').
 *   The object is read on every import, so mocks may be added between loads.
 */
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createRequire } = require('node:module')
const ts = require('typescript')

const ROOT = path.resolve(__dirname, '..', '..')
const requireFromRoot = createRequire(path.join(ROOT, 'package.json'))
const CANDIDATES = ['', '.ts', '.tsx', '/index.ts', '/index.tsx']

function resolveProjectFile(specifier, fromFile) {
  let base
  if (specifier.startsWith('@/')) base = path.join(ROOT, specifier.slice(2))
  else if (specifier.startsWith('.')) base = path.resolve(path.dirname(fromFile), specifier)
  else return null
  for (const suffix of CANDIDATES) {
    const candidate = base + suffix
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate
  }
  throw new Error(`Cannot resolve "${specifier}" from ${path.relative(ROOT, fromFile)}`)
}

/**
 * @param {{ mocks?: Record<string, unknown> }} [options]
 * @returns {{ load: (file: string) => any, mocks: Record<string, unknown>, root: string }}
 */
function createLoader({ mocks = {} } = {}) {
  const cache = new Map()

  function load(file) {
    const filename = path.resolve(ROOT, file)
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }
    cache.set(filename, module)

    const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      fileName: filename,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    })
    const localRequire = specifier => {
      if (Object.hasOwn(mocks, specifier)) return mocks[specifier]
      if (specifier === 'server-only') return {}
      const projectFile = resolveProjectFile(specifier, filename)
      return projectFile ? load(projectFile) : requireFromRoot(specifier)
    }
    const wrapper = vm.runInThisContext(
      `(function (exports, require, module, __filename, __dirname) {${outputText}\n})`,
      {
        filename,
      },
    )
    wrapper(module.exports, localRequire, module, filename, path.dirname(filename))
    return module.exports
  }

  return { load, mocks, root: ROOT }
}

module.exports = { createLoader, ROOT }
