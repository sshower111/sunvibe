"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Clock } from "lucide-react"

interface PickupTimeAlertProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  message: string
}

export function PickupTimeAlert({ open, onOpenChange, message }: PickupTimeAlertProps) {
  const router = useRouter()

  const handleGotIt = () => {
    onOpenChange(false)

    // Navigate to menu page if not already there
    if (!window.location.pathname.includes('/menu')) {
      router.push('/menu#pickup-time-section')
    } else {
      // Already on menu page, just scroll to pickup section
      const pickupSection = document.getElementById('pickup-time-section')
      if (pickupSection) {
        pickupSection.scrollIntoView({ behavior: 'smooth', block: 'center' })

        // Add highlight/pulse effect
        pickupSection.classList.add('ring-4', 'ring-accent/50', 'rounded-xl', 'animate-pulse')
        setTimeout(() => {
          pickupSection.classList.remove('animate-pulse')
          setTimeout(() => {
            pickupSection.classList.remove('ring-4', 'ring-accent/50', 'rounded-xl')
          }, 1000)
        }, 2000)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-accent/10 p-3">
              <Clock className="h-8 w-8 text-accent" />
            </div>
          </div>
          <DialogTitle className="text-center font-serif text-xl">
            Pickup Time Required
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            {message}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center pt-2">
          <Button
            onClick={handleGotIt}
            className="bg-accent hover:bg-accent/90 text-accent-foreground px-8"
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
