import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

// Focus rings come from the global :focus-visible rule in app/globals.css, so every control looks the same.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap action-button cursor-pointer disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 aria-busy:cursor-progress [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80',
        destructive: 'bg-destructive text-white hover:bg-destructive/90 active:bg-destructive/80',
        outline:
          'border border-input bg-card text-foreground hover:border-foreground/40 hover:bg-secondary active:bg-muted',
        secondary: 'border border-transparent bg-secondary text-secondary-foreground hover:bg-muted active:bg-border',
        ghost: 'hover:bg-secondary active:bg-muted',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: '',
        sm: '',
        lg: '',
        icon: 'size-12 p-0',
        'icon-sm': 'size-12 p-0',
        'icon-lg': 'size-12 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Shows a spinner and blocks clicks while a request is running. */
    loading?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && !asChild ? (
        <>
          <Loader2 aria-hidden="true" className="animate-spin" />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
