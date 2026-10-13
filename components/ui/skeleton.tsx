import { cn } from '@/lib/utils'

/** Grey placeholder block shown while content loads. Hidden from screen readers; pair it with a status message. */
export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div aria-hidden="true" data-slot="skeleton" className={cn('skeleton', className)} {...props} />
}
