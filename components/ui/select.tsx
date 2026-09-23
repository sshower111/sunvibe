import * as React from 'react'
import { cn } from '@/lib/utils'
export function NativeSelect({ className, ...props }: React.ComponentProps<'select'>) {
  return <select data-slot="select" className={cn('form-control pr-10', className)} {...props} />
}
