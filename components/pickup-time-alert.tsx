"use client"

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
            onClick={() => onOpenChange(false)}
            className="bg-accent hover:bg-accent/90 text-accent-foreground px-8"
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
