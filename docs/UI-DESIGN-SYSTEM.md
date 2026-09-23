# Shared interface design system

The storefront uses Tailwind 4 CSS-first configuration in `app/globals.css`.

- Type: H1 36–56px, H2 28–40px, H3 20px; Playfair Display, weight 600, consistent line height and tracking. Body uses Inter at 16px/1.6. `heading-label` is the compact sans-serif label treatment for footer and contact subsections.
- Layout: `site-container` uses an 80rem maximum with fluid 16–32px gutters; `section-space` provides 48/64px vertical spacing. `page-space` reserves the fixed header plus 32px. Small login and confirmation panels retain readable width constraints.
- Navigation: a shared 64/96px header row and a reserved 180px logo frame remain unchanged on scroll and between routes. Stable scrollbar gutters prevent horizontal jumps.
- Buttons: `Button` and `buttonVariants` provide primary (default), secondary and outline variants. Text actions share 8px corners, 12px/20px padding, 48px minimum height and 160ms color transitions. Icon-only controls reserve a 48px square; navigation and image/card triggers retain their content-specific layout.
- Fields: `Input`, `Textarea`, `NativeSelect` and `form-control` share 16px text, left-aligned placeholders, 12px/16px padding, muted borders, and a visible 2px focus outline. Error borders use aria-invalid. Touch defaults live in the base layer so they cannot accidentally reveal hidden links.
- Menu: desktop/tablet cards share row tracks through CSS subgrid, aligning category, title, description and price/actions without clipping longer titles. Mobile retains the horizontal list layout and complete titles.
- Color: darkened muted text and input borders improve contrast. Gold remains a decorative accent; CTA text uses the shared contrasting palette.

Use these primitives rather than adding per-page font sizes, radii, button padding or control borders. Color/layout exceptions should have a specific semantic purpose. The unused legacy map's inline border style was replaced with a utility; no inline React style props remain in app/components.

## Validation

Browser checks covered home, menu, gallery and contact at 320, 390, 768 and 1440px: no horizontal overflow. Desktop cards matched in height and text/price row positions. Menu details restored keyboard focus after Escape; mobile navigation also restored focus. Computed contact inputs used 16px text, 8px corners, 12px/16px padding, left-aligned placeholders and a 2px focus outline. Desktop menu and mobile contact screenshots were visually reviewed.

TypeScript still reports pre-existing errors in admin gallery FormData handling, Stripe API version declarations and Chatbase window typing. No new UI-component TypeScript errors were reported. Deployment status is recorded in RELEASE-2026-09-23.md.

Heading colors are owned by the heading utilities: primary bakery brown by default. Use heading-on-dark only for headings on dark imagery. Compact heading-label elements inherit their section color, preserving footer contrast. Page titles must not add independent text color utilities.
