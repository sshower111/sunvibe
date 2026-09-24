import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { pageMetadata } from '@/lib/seo'
export const metadata = pageMetadata('/privacy')
export default function PrivacyPage() {
  return <><Navigation /><main id="main-content" tabIndex={-1} className="site-container page-space max-w-3xl"><h1 className="heading-1">Sunville Bakery privacy notice</h1>
    <section className="mt-8 space-y-4"><h2 className="heading-2">Contact and cake inquiries</h2><p>We use the contact details, message, event information, and reference photos you submit to respond to your inquiry and discuss your order. Our forms send this information to the bakery through our email delivery provider, Resend.</p></section>
    <section className="mt-8 space-y-4"><h2 className="heading-2">Spam protection</h2><p>Our forms use Cloudflare Turnstile to help prevent automated spam. Turnstile processes browser and device signals to verify requests, including when its widget is invisible. See <a href="https://www.cloudflare.com/turnstile-privacy-policy/" className="underline underline-offset-4">Cloudflare’s Turnstile Privacy Addendum</a> for information about this processing.</p></section>
    <section className="mt-8 space-y-4"><h2 className="heading-2">Website measurement</h2><p>We use Vercel Analytics and Speed Insights to understand website use and performance. These services process website usage and performance measurements.</p></section>
    <section className="my-8 space-y-4"><h2 className="heading-2">Questions</h2><p>Contact us about information you have shared with the bakery at <a className="underline underline-offset-4" href="mailto:sunvillebakerylv@gmail.com">sunvillebakerylv@gmail.com</a> or <a className="underline underline-offset-4" href="tel:+17028899887">702-889-9887</a>.</p></section>
  </main><Footer /></>
}
