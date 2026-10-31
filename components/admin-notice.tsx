export type Notice = { type: 'success' | 'error'; text: string } | null

export function NoticeBar({ notice }: { notice: Notice }) {
  if (!notice) return null
  return (
    <p
      role={notice.type === 'error' ? 'alert' : 'status'}
      className={
        'rounded-lg border p-3 text-sm ' +
        (notice.type === 'error'
          ? 'border-red-200 bg-red-50 text-red-800'
          : 'border-green-200 bg-green-50 text-green-800')
      }
    >
      {notice.text}
    </p>
  )
}
