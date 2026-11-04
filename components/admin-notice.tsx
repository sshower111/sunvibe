export type Notice = { type: 'success' | 'error'; text: string } | null

export function NoticeBar({ notice }: { notice: Notice }) {
  if (!notice) return null
  return (
    <p
      role={notice.type === 'error' ? 'alert' : 'status'}
      className={
        'admin-pop-in rounded-xl px-4 py-3 text-sm font-medium ' +
        (notice.type === 'error' ? 'bg-red-100/70 text-red-800' : 'bg-green-100/70 text-green-800')
      }
    >
      {notice.text}
    </p>
  )
}
