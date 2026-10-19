# Design system

All tokens live in `app/globals.css` (Tailwind 4, CSS-first). Change a token there and every page follows. Use the tokens and utilities below instead of raw colors, radii or font sizes.

Look (2026-10-18 redesign): **Hong Kong bakery counter**. Pastry-box red, egg-wash gold (pineapple-bun crust), pink box paper, char-siu brown ink. One standout element: Chinese item names set large in red, like a shelf label. Everything else stays plain.

The refactor is done in steps, each reviewed before the next:

1. **Tokens** (done, 2026-10-13): colors, radius, shadow, motion, spacing, type scale.
2. **Interactive states** (done, 2026-10-13): hover/pressed, focus rings, disabled, loading.
3. **Responsive** (done, 2026-10-13): fluid sizing, text wrapping, mobile padding, 44px touch targets.
4. **Components**, one at a time: hero (done, 2026-10-13), menu grid (done, 2026-10-16), cake inquiry form (done, 2026-10-16), header and mobile menu (done, 2026-10-16).

## Color

| Token                                      | Hex       | Use                                                                 |
| ------------------------------------------ | --------- | ------------------------------------------------------------------- |
| `brand` (`primary`)                        | `#a3201c` | Pastry-box red: buttons, headings, links, focus ring, page bands    |
| `brand-deep`                               | `#7a1612` | Hover/pressed red                                                   |
| `gold` (`accent-warm`)                     | `#e9a93b` | Egg-wash gold: ribbon edge under red bands and footer, footer CTA. Fills only, never text on white |
| `surface`                                  | `#fbede8` | Pink box paper: soft sections (`bg-surface`, `bg-muted`)            |
| `surface-soft` (`secondary`)               | `#fdf6f3` | Lightest tint: hovers, placeholders                                 |
| `ink`                                      | `#2b1a14` | Char-siu brown: body text, footer background                        |
| `ink-muted`                                | `#6b5650` | Secondary text                                                      |
| `paper`                                    | `#ffffff` | Page background                                                     |
| `line` / `input-line`                      |           | Borders / form field borders                                        |
| `success`, `warning`, `danger` (+ `-tint`) |           | Status messages and errors                                          |

Cards and popovers are white. Dark mode is not used.

## Shape, depth, motion

- Radius: `rounded-sm` 6px, `rounded-md` 8px (buttons and fields, `--control-radius`), `rounded-lg` 12px (cards, images). `rounded-xl` is the same as `rounded-lg`.
- Shadow: flat by default; `shadow-pop` only for menus, popovers and hovered cards.
- Motion: `--duration-fast` 150ms, `--duration-base` 200ms, `ease-standard`. Reduced-motion users get no animation.

## Layout and type

- `site-container`: 80rem max width, fluid gutter `--gutter` (16–32px).
- `section-space`: fluid 48–96px vertical padding. `page-space`: clears the fixed header (`--header-height`, 64px / 96px on desktop).
- Touch targets: `--tap` 44px minimum on phones and tablets.
- Type: Young Serif headings (one weight, 400; never bold), Figtree body at 16px/1.6, Noto Serif HK Black for Chinese (`han`, `han-label`).
  - `text-display` 40–72px (hero), `heading-1` 34–52px, `heading-2` 26–36px, `heading-3` 20px. Headings balance their line breaks.
  - `eyebrow`: small muted sentence-case label (no capitals or letter spacing). `text-pretty-body`: muted paragraph, 65 characters wide, no orphans.
  - `heading-label`: compact sans-serif label for footer and contact subsections. `heading-on-dark` for headings over photos.
- `han-label`: red Chinese item name. Use `<ItemName name="Pineapple Bun 菠蘿包" />` (`components/item-name.tsx`), which splits the English and Chinese with `splitName` (`lib/bilingual.ts`).
- `signboard`: red background, white text and headings. `<PageBand>` (`components/page-band.tsx`) is the red band with the gold edge at the top of menu, custom cakes, gallery and contact. It pads itself under the fixed header.
- `<StoreStatus>` (`components/store-status.tsx`): live open/closed line in Las Vegas time; `onLight` for white backgrounds.
- Other utilities: `surface`, `badge`, `price` (tabular numbers), `action-button`, `form-control`, `menu-card`.

## Interactive states

- **Focus**: one 2px brown ring, 2px away from the edge, shown only for keyboard users (`:focus-visible` in `app/globals.css`). Components should not add their own focus rings. A menu card outlines as a whole when its hidden button is focused.
- **Hover / pressed**: buttons darken on hover and darken more and shrink slightly (98%) when pressed. Outline buttons also get a darker border. Menu cards lift 2px with `shadow-pop` and their photo zooms to 104% (`menu-card-photo`), only on devices with a mouse. Form fields get a darker border on hover.
- **Disabled**: 50% opacity, no clicks (buttons); fields get a soft background and a not-allowed cursor. Links styled as buttons use `aria-disabled`.
- **Loading**: `<Button loading>` shows a spinner, disables the button and sets `aria-busy` (used on contact, cake inquiry, admin sign-in, add photo link). `<Skeleton>` (`components/ui/skeleton.tsx`, `skeleton` utility) is a pulsing placeholder; always pair it with a screen-reader "Loading…" status. Menu pages use `MenuGridSkeleton` (`components/menu-grid-skeleton.tsx`), which has the same shape as a menu card; the admin menu and photo lists use `Skeleton` directly.
- **Form messages** (`components/ui/form-message.tsx`): `FormAlert` (error or success box with icon) goes right above the submit button and lists every field problem (contact and cake inquiry forms); fields point to it with `aria-describedby`. `FieldError` is a small red line under one field, only for messages that appear without pressing submit (for example a photo that cannot be added). Forms use `noValidate` so the browser's own bubbles don't appear, and invalid fields get `aria-invalid` (red border).
- Checkboxes and radios use the brand color. Buttons, summaries and labels show a pointer cursor.

## Responsive

- Sizes scale with the screen using `clamp()` instead of jumping at breakpoints: headings, `section-space`, `--gutter`, and card padding (`card-pad` 16–32px, `card-pad-lg` 20–40px). Use these instead of `p-6 sm:p-8`.
- Headings balance their lines; paragraphs and list items use `text-wrap: pretty`; links and addresses break long words.
- Touch targets: at least 44px wide and 48px tall (`min-h-12 min-w-11`) for text links in the header, footer and forms. Phones and tablets also get a 44px minimum on buttons and tel/mail/map links.
- Fixed bottom bars add `env(safe-area-inset-bottom)` padding.
- On dark backgrounds set `[--ring:#fff]` so the focus ring stays visible.
- Check new pages at 320, 390 and 768px: no sideways scrolling.
- Home hero: full-bleed bakery photo with a dark shade behind the words (left on 768px+, bottom on phones) and the gold ribbon edge.
- Home photo strip (`components/bakery-marquee.tsx`): menu photos with a thin gold frame and red Chinese name, moving about 35px a second. Pauses on hover, focus and the Pause button; reduced-motion visitors get a scrollable strip. Items come from `lib/marquee-items.ts` (every menu item with a photo).
- Contact: the form comes first on phones; visit details move beside it from 1024px.

## Header

- `components/navigation.tsx`: white header, `shadow-pop` once the page has scrolled. Desktop: text links, current page red with a 3px underline; a red phone button on screens 1024px and wider.
- Phone menu: full-width list below the header (56px rows in Young Serif, chevrons, red bar on the current page), then Call and Directions buttons and the hours from `lib/site-info.ts`. The page behind is dimmed (`bg-ink/30`) and locked from scrolling; outside tap, Escape, a link or widening past 768px closes it.

## Rules

- No raw colors (`bg-white`, `text-red-600`, `#hex`) in components; use the tokens. Older pages still have some, and later steps replace them.
- Page titles do not set their own color; heading utilities own it.
- Inputs keep 16px text on phones so iOS does not zoom.
