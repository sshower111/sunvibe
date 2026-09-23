import type { Metadata } from 'next'
import Link from 'next/link'
import { CakeSlice, ClipboardList, MessageSquare, ShoppingBag, ArrowRight } from 'lucide-react'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { buttonVariants } from '@/components/ui/button'
import { CakeInquiryForm } from '@/components/cake-inquiry-form'
import { CakeServingGuide } from '@/components/cake-serving-guide'
import { earliestCakeDate } from '@/lib/cake-inquiry'

export const metadata: Metadata = {
  title: 'Custom Cake Inquiries',
  description: 'Plan a custom celebration cake with Sunville Bakery in Las Vegas. Explore serving guidance and request a personalized cake quote.',
  alternates: { canonical: '/custom-cakes' },
}
export default function CustomCakesPage() {
  return <main className="min-h-screen bg-background">
    <Navigation />
    <section className="page-space border-b bg-secondary" aria-labelledby="cake-heading">
      <div className="site-container grid items-center gap-8 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="max-w-3xl"><p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">Made for your celebration</p><h1 id="cake-heading" className="heading-1">Custom Cakes for Your Special Moments</h1><p className="mt-5 max-w-2xl text-lg text-muted-foreground">Handcrafted chiffon & celebration cakes for weddings, birthdays & anniversaries. Tell us what you have in mind—we’ll work out the details together.</p><p className="mt-5 font-semibold">Please order at least 3–5 days in advance.</p><p className="mt-1 text-sm text-muted-foreground">Dates and designs are subject to availability.</p><div className="mt-7 flex flex-wrap gap-3"><a href="#cake-inquiry" className={buttonVariants()}>Start Your Inquiry <ArrowRight aria-hidden="true" /></a><a href="#serving-guide" className={buttonVariants({ variant: 'outline' })}>Find your cake size</a></div></div>
        <div className="hidden rounded-xl border border-primary/15 bg-card p-8 lg:block"><CakeSlice aria-hidden="true" className="mb-5 size-12 text-primary" /><p className="heading-3">A little inspiration.<br />A cake that feels like you.</p><p className="mt-4 text-sm text-muted-foreground">Bring your colors, theme, or a reference photo. Your inquiry starts a conversation, with no payment collected here.</p></div>
      </div>
    </section>
    <section className="site-container section-space" aria-labelledby="process-heading">
      <h2 id="process-heading" className="heading-2">From an idea to a celebration</h2>
      <div className="mt-7 grid gap-5 md:grid-cols-3">
        {[{ icon: ClipboardList, title: '1. Share your idea', text: 'Send your event date, guest count, and design inspiration. Please allow at least 3–5 days.' }, { icon: MessageSquare, title: '2. Confirm your design & quote', text: 'We’ll review your preferences and confirm availability, design details, final pricing, and any payment requirements.' }, { icon: ShoppingBag, title: '3. Arrange your celebration', text: 'Confirm pickup with the bakery. If you need delivery, ask us about availability and fees before ordering.' }].map(({ icon: Icon, title, text }) => <div key={title} className="rounded-xl border bg-card p-6"><Icon aria-hidden="true" className="mb-4 size-6 text-primary" /><h3 className="heading-3">{title}</h3><p className="mt-3 text-sm text-muted-foreground">{text}</p></div>)}
      </div>
    </section>
    <CakeServingGuide />
    <section className="site-container py-8" aria-labelledby="inspiration-heading"><div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5"><div><h2 id="inspiration-heading" className="heading-3">Gather a little inspiration</h2><p className="mt-2 text-sm text-muted-foreground">Explore our bakery gallery, or upload your own reference photos below.</p></div><Link href="/gallery" className={buttonVariants({ variant: 'outline' })}>Visit the gallery <ArrowRight aria-hidden="true" /></Link></div></section>
    <section id="cake-inquiry" className="site-container section-space" aria-labelledby="inquiry-heading"><div className="grid items-start gap-8 lg:grid-cols-[0.7fr_1.3fr]"><div><p className="mb-2 text-sm font-semibold text-primary">Let’s make it special</p><h2 id="inquiry-heading" className="heading-2">Tell us about your cake</h2><p className="mt-4 text-muted-foreground">A few details help us recommend a size and prepare your quote. Not sure about a flavor or design? We’re happy to help.</p><p className="mt-4 text-sm text-muted-foreground">Submitting this form does not reserve a date or confirm an order.</p><a href="tel:+17028899887" className="mt-5 inline-flex min-h-12 items-center text-primary underline underline-offset-4">Prefer to talk? 702-889-9887</a></div><CakeInquiryForm minDate={earliestCakeDate()} /></div></section>
    <Footer />
  </main>
}
