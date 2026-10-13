import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Short error under a single field. Link it to the field with aria-describedby={id}. */
export function FieldError({
  id,
  children,
  className,
}: {
  id: string
  children?: React.ReactNode
  className?: string
}) {
  if (!children) return null
  return (
    <p id={id} className={cn('mt-2 flex items-start gap-1.5 text-sm font-medium text-danger', className)}>
      <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

/** Message for the whole form (sent, or could not send). Place it right above the submit button. */
export function FormAlert({
  type,
  id,
  children,
  className,
}: {
  type: 'error' | 'success'
  id?: string
  children: React.ReactNode
  className?: string
}) {
  const Icon = type === 'error' ? AlertCircle : CheckCircle2
  return (
    <div
      id={id}
      role={type === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2.5 rounded-md border px-4 py-3 text-sm font-medium animate-in fade-in duration-200',
        type === 'error'
          ? 'border-danger/25 bg-danger-tint text-danger'
          : 'border-success/25 bg-success-tint text-success',
        className,
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  )
}
