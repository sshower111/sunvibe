// JSON-LD is data, not executable script, so it needs no CSP nonce. Avoiding headers() here
// lets read-only pages be cached instead of rendered on every request.
export function StructuredData({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
}
