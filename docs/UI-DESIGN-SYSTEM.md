# Design system

All tokens live in `app/globals.css` (Tailwind 4, CSS-first). Change a token there and every page follows. Use the tokens and utilities below instead of raw colors, radii or font sizes.

Look: the original warm bakery palette (brown primary, gold accent, off-white background) with a cleaner, more consistent layout.

The refactor is done in steps, each reviewed before the next:

1. **Tokens** (done, 2026-10-13): colors, radius, shadow, motion, spacing, type scale.
2. **Interactive states** (done, 2026-10-13): hover/pressed, focus rings, disabled, loading.
3. **Responsive** (done, 2026-10-13): fluid sizing, text wrapping, mobile padding, 44px touch targets.
4. **Components**, one at a time: hero (done, 2026-10-13), menu grid (done, 2026-10-16), cake inquiry form, header and mobile menu.

## Color

The original colors are kept. They now live under named tokens so later steps can stop using raw colors like `bg-white` or `text-red-600`.

| Token                                      | Use                                                            |
| ------------------------------------------ | -------------------------------------------------------------- |
| `ink`                                      | Body text (`text-foreground`)                                  |
| `ink-muted`                                | Secondary text (`text-muted-foreground`)                       |
| `paper`                                    | Off-white page background                                      |
| `brand`                                    | Bakery brown: buttons, headings, links, focus ring (`primary`) |
| `surface`                                  | Soft section background (`bg-surface`, `bg-muted`)             |
| `line` / `input-line`                      | Borders / form field borders                                   |
| `accent-warm` (`accent`)                   | Gold highlights                                                |
| `success`, `warning`, `danger` (+ `-tint`) | Status messages and errors                                     |

Cards and popovers stay pure white. Dark mode is not used.

## Shape, depth, motion

- Radius: `rounded-sm` 6px, `rounded-md` 10px (buttons and fields, `--control-radius`), `rounded-lg` 16px (cards, images). `rounded-xl` is the same as `rounded-lg`.
- Shadow: flat by default; `shadow-pop` only for menus, popovers and hovered cards.
- Motion: `--duration-fast` 150ms, `--duration-base` 200ms, `ease-standard`. Reduced-motion users get no animation.

## Layout and type

- `site-container`: 80rem max width, fluid gutter `--gutter` (16–32px).
- `section-space`: fluid 48–96px vertical padding. `page-space`: clears the fixed header (`--header-height`, 64px / 96px on desktop).
- Touch targets: `--tap` 44px minimum on phones and tablets.
- Type: Playfair Display headings, Inter body at 16px/1.6.
  - `text-display` 40–72px (hero), `heading-1` 34–52px, `heading-2` 26–36px, `heading-3` 20px. Headings balance their line breaks.
  - `eyebrow`: small uppercase label above a heading. `text-pretty-body`: muted paragraph, 65 characters wide, no orphans.
  - `heading-label`: compact sans-serif label for footer and contact subsections. `heading-on-dark` for headings over photos.
- Other utilities: `surface`, `badge`, `price` (tabular numbers), `action-button`, `form-control`, `menu-card`.

## Interactive states

- **Focus**: one 2px brown ring, 2px away from the edge, shown only for keyboard users (`:focus-visible` in `app/globals.css`). Components should not add their own focus rings. A menu card outlines as a whole when its hidden button is focused.
- **Hover / pressed**: buttons darken on hover and darken more and shrink slightly (98%) when pressed. Outline buttons also get a darker border. Menu cards lift 2px with `shadow-pop` and their photo zooms to 104% (`menu-card-photo`), only on devices with a mouse. Form fields get a darker border on hover.
- **Disabled**: 50% opacity, no clicks (buttons); fields get a soft background and a not-allowed cursor. Links styled as buttons use `aria-disabled`.
- **Loading**: `<Button loading>` shows a spinner, disables the button and sets `aria-busy` (used on contact, cake inquiry, admin sign-in, add photo link). `<Skeleton>` (`components/ui/skeleton.tsx`, `skeleton` utility) is a pulsing placeholder; always pair it with a screen-reader "Loading…" status. Menu pages use `MenuGridSkeleton` (`components/menu-grid-skeleton.tsx`), which has the same shape as a menu card; the admin menu and photo lists use `Skeleton` directly.
- **Form messages** (`components/ui/form-message.tsx`): `FormAlert` (error or success box with icon) goes right above the submit button; `FieldError` is a small red line under one field. Forms use `noValidate` so the browser's own bubbles don't appear, and invalid fields get `aria-invalid` (red border).
- Checkboxes and radios use the brand color. Buttons, summaries and labels show a pointer cursor.

## Responsive

- Sizes scale with the screen using `clamp()` instead of jumping at breakpoints: headings, `section-space`, `--gutter`, and card padding (`card-pad` 16–32px, `card-pad-lg` 20–40px). Use these instead of `p-6 sm:p-8`.
- Headings balance their lines; paragraphs and list items use `text-wrap: pretty`; links and addresses break long words.
- Touch targets: at least 44px wide and 48px tall (`min-h-12 min-w-11`) for text links in the header, footer and forms. Phones and tablets also get a 44px minimum on buttons and tel/mail/map links.
- Fixed bottom bars add `env(safe-area-inset-bottom)` padding.
- On dark backgrounds set `[--ring:#fff]` so the focus ring stays visible.
- Check new pages at 320, 390 and 768px: no sideways scrolling.

## Rules

- No raw colors (`bg-white`, `text-red-600`, `#hex`) in components; use the tokens. Older pages still have some, and later steps replace them.
- Page titles do not set their own color; heading utilities own it.
- Inputs keep 16px text on phones so iOS does not zoom.
