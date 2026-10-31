import { useId } from 'react'
import { findCake } from '@/lib/cake-catalog'

// A drawing of the cake being planned on /order-cake. It follows the choices as they are made:
// size and tiers, sponge color for the flavor (per tier when the tiers differ), a filling stripe,
// writing and (for custom designs) flowers on top. Round cakes sit on a plate, sheet cakes on a board.
// Colors are the food's own; the page chrome stays in the design tokens.

const sponge: Record<string, string> = {
  Vanilla: '#f3d98b',
  Chocolate: '#6b4029',
  Coffee: '#a77a52',
  'Green Tea': '#a9bb6b',
  Orange: '#f2b552',
  Pandan: '#9cc47a',
}
const filling: Record<string, string> = {
  'Mixed Fresh Fruit': '#e4695a',
  Strawberry: '#e2707e',
  Banana: '#f4e1a0',
  Mango: '#f5a83a',
  Taro: '#b49ac8',
  Custard: '#f6d77a',
  Coconut: '#fbf6ee',
  Durian: '#e9d27c',
}
const PLAIN_SPONGE = '#f0dcb4'
const CREAM = '#fffaf1'
const CREAM_EDGE = '#ead9c6'
const PIPING = '#f6ead8'

type Shape = { kind: 'round'; tiers: number[] } | { kind: 'sheet'; width: number; depth: number }

function shapeOf(size: string): Shape {
  if (size === 'quarter-sheet') return { kind: 'sheet', width: 136, depth: 34 }
  if (size === 'half-sheet') return { kind: 'sheet', width: 170, depth: 40 }
  if (size === 'full-sheet') return { kind: 'sheet', width: 196, depth: 46 }
  const tiers = size.startsWith('tier-') ? size.slice(5).split('-').map(Number).reverse() : [parseInt(size, 10)]
  return { kind: 'round', tiers: tiers.every(n => n > 0) ? tiers : [8] }
}

const W = 240
const H = 180
const PLATE_Y = 160
const tierHeightFor = (tiers: number) => (tiers === 1 ? 72 : tiers === 2 ? 52 : 40)
const roundWidth = (inches: number) => Math.min(96 + (inches - 6) * 8, 212)
const SHEET_HEIGHT = 64

/** The cake's top edge and half its width, so the drawing can zoom to fit it. */
function bounds(shape: Shape) {
  if (shape.kind === 'sheet')
    return { top: PLATE_Y - 2 - SHEET_HEIGHT - shape.depth * 0.7, half: (shape.width + shape.depth * 0.6) / 2 }
  const topWidth = roundWidth(shape.tiers[shape.tiers.length - 1])
  return {
    top: PLATE_Y - 2 - tierHeightFor(shape.tiers.length) * shape.tiers.length - topWidth * 0.14,
    half: Math.max(...shape.tiers.map(roundWidth)) / 2,
  }
}

export function CakePreview({
  size,
  flavor,
  fillingName,
  tiers,
  design,
  message,
  className,
}: {
  size: string
  flavor: string
  fillingName: string
  /** Tiered cakes with a different flavor per tier, top tier first. */
  tiers?: { flavor: string; filling: string }[]
  design: '' | 'simple' | 'custom'
  message: string
  className?: string
}) {
  const shadeId = useId()
  const cake = findCake(size)
  const known = !!cake
  const shape = shapeOf(known ? size : '8-inch')
  const spongeColor = sponge[flavor] ?? PLAIN_SPONGE
  const fillColor = filling[fillingName] ?? CREAM
  // Bottom tier first, like the drawing.
  const tierColors =
    shape.kind === 'round'
      ? shape.tiers.map((_, i) => {
          const t = tiers?.[shape.tiers.length - 1 - i]
          return t
            ? { sponge: sponge[t.flavor] ?? PLAIN_SPONGE, fill: filling[t.filling] ?? CREAM }
            : { sponge: spongeColor, fill: fillColor }
        })
      : []
  // Zoom so the cake fills the frame (never closer than 200 units wide, so sizes still compare).
  const { top, half } = bounds(shape)
  const plate = half + 14
  const bottom = PLATE_Y + 22
  const viewWidth = Math.min(W, Math.max(200, 2 * plate + 12, ((bottom - (top - 16)) * W) / H))
  const viewHeight = (viewWidth * H) / W
  const label = known
    ? `Drawing of your cake: ${cake.label}` +
      (flavor && sponge[flavor] ? `, ${flavor.toLowerCase()} sponge` : '') +
      (filling[fillingName] ? ` with ${fillingName.toLowerCase()} filling` : '') +
      (message.trim() ? `, reading “${message.trim()}”` : '')
    : 'Drawing of a cake, waiting for your choices'

  return (
    <svg
      viewBox={`${(W - viewWidth) / 2} ${bottom - viewHeight} ${viewWidth} ${viewHeight}`}
      role="img"
      aria-label={label}
      className={className}
      style={{ opacity: known ? 1 : 0.45 }}
    >
      {shape.kind === 'round' ? (
        <RoundCake
          shadeId={shadeId}
          tiers={shape.tiers}
          plate={plate}
          colors={tierColors}
          design={design}
          message={message}
        />
      ) : (
        <SheetCake
          width={shape.width}
          depth={shape.depth}
          spongeColor={spongeColor}
          fillColor={fillColor}
          design={design}
          message={message}
        />
      )}
    </svg>
  )
}

/** Sponge, filling, sponge, filling, sponge from the bottom up, as fractions of the tier height. */
const LAYERS: [kind: 'sponge' | 'fill', from: number, to: number][] = [
  ['sponge', 0, 0.3],
  ['fill', 0.3, 0.4],
  ['sponge', 0.4, 0.66],
  ['fill', 0.66, 0.76],
  ['sponge', 0.76, 1],
]

function RoundCake({
  shadeId,
  tiers,
  plate,
  colors,
  design,
  message,
}: {
  shadeId: string
  tiers: number[]
  plate: number
  /** Sponge and filling color of each tier, bottom first. */
  colors: { sponge: string; fill: string }[]
  design: '' | 'simple' | 'custom'
  message: string
}) {
  const cx = W / 2
  const tierHeight = tierHeightFor(tiers.length)
  let bottom = PLATE_Y - 2
  const drawn = tiers.map(inches => {
    const w = roundWidth(inches)
    const tier = { w, rx: w / 2, ry: w * 0.14, bottom, top: bottom - tierHeight }
    bottom = tier.top
    return tier
  })
  const last = drawn[drawn.length - 1]
  return (
    <g>
      {/* Plate and its shadow */}
      <ellipse cx={cx} cy={PLATE_Y + 6} rx={plate + 2} ry={14} fill="#2b1a14" opacity={0.08} />
      <ellipse cx={cx} cy={PLATE_Y} rx={plate} ry={16} fill="#ffffff" stroke={CREAM_EDGE} />
      {drawn.map((t, index) => {
        const x0 = cx - t.rx
        const x1 = cx + t.rx
        // A band of the cake's side between two heights; both edges follow the front of the ellipse.
        const band = (from: number, to: number) => {
          const yb = t.bottom - (t.bottom - t.top) * from
          const yt = t.bottom - (t.bottom - t.top) * to
          return `M${x0},${yt} A${t.rx},${t.ry} 0 0 0 ${x1},${yt} L${x1},${yb} A${t.rx},${t.ry} 0 0 1 ${x0},${yb} Z`
        }
        return (
          <g key={index}>
            {LAYERS.map(([kind, from, to]) => (
              <path
                key={from}
                d={band(from, to)}
                fill={kind === 'sponge' ? colors[index].sponge : colors[index].fill}
              />
            ))}
            {/* Soft shade on the right side gives the tier its roundness. */}
            <path d={band(0, 1)} fill={`url(#${shadeId})`} />
            <path d={band(0, 1)} fill="none" stroke="#2b1a14" strokeOpacity={0.12} />
            <ellipse cx={cx} cy={t.top} rx={t.rx} ry={t.ry} fill={CREAM} stroke={CREAM_EDGE} />
            <Piping cx={cx} cy={t.top} rx={t.rx} ry={t.ry} />
          </g>
        )
      })}
      <defs>
        <linearGradient id={shadeId} x1="0" x2="1">
          <stop offset="0.55" stopColor="#2b1a14" stopOpacity={0} />
          <stop offset="1" stopColor="#2b1a14" stopOpacity={0.18} />
        </linearGradient>
      </defs>
      {design === 'custom' && <Flowers cx={cx} cy={last.top - last.ry * 0.5} spread={last.rx * 0.5} />}
      <Writing x={cx} y={last.top + last.ry * 0.45} maxWidth={last.w * 0.7} message={message} />
    </g>
  )
}

function SheetCake({
  width,
  depth,
  spongeColor,
  fillColor,
  design,
  message,
}: {
  width: number
  depth: number
  spongeColor: string
  fillColor: string
  design: '' | 'simple' | 'custom'
  message: string
}) {
  const height = SHEET_HEIGHT
  const x0 = (W - width - depth * 0.6) / 2
  const x1 = x0 + width
  const yb = PLATE_Y - 2
  const yt = yb - height
  const dx = depth * 0.6
  const dy = depth * 0.7
  const rowY = (f: number) => yb - height * f
  // Cake board drawn in the same slant as the cake, a little larger all round, with a thin front and side edge.
  const mx = 10
  const mz = 9
  const board = {
    fl: [x0 - mx - mz * 0.6, yb + mz * 0.7],
    fr: [x1 + mx - mz * 0.6, yb + mz * 0.7],
    br: [x1 + mx + dx + mz * 0.6, yb - dy - mz * 0.7],
    bl: [x0 - mx + dx + mz * 0.6, yb - dy - mz * 0.7],
  }
  const edge = 4
  const pt = ([x, y]: number[], down = 0) => `${x},${y + down}`
  return (
    <g>
      <path
        d={`M${pt(board.fl, edge + 3)} L${pt(board.fr, edge + 3)} L${pt(board.br, edge + 3)} L${pt(board.bl, edge + 3)} Z`}
        fill="#2b1a14"
        opacity={0.08}
      />
      <path d={`M${pt(board.fl)} L${pt(board.fr)} L${pt(board.fr, edge)} L${pt(board.fl, edge)} Z`} fill={CREAM_EDGE} />
      <path d={`M${pt(board.fr)} L${pt(board.br)} L${pt(board.br, edge)} L${pt(board.fr, edge)} Z`} fill="#dcc6ae" />
      <path
        d={`M${pt(board.fl)} L${pt(board.fr)} L${pt(board.br)} L${pt(board.bl)} Z`}
        fill="#ffffff"
        stroke={CREAM_EDGE}
      />
      {/* Right side face, in shade */}
      {LAYERS.map(([kind, from, to]) => (
        <path
          key={'side' + from}
          d={`M${x1},${rowY(to)} L${x1 + dx},${rowY(to) - dy} L${x1 + dx},${rowY(from) - dy} L${x1},${rowY(from)} Z`}
          fill={kind === 'sponge' ? spongeColor : fillColor}
        />
      ))}
      <path
        d={`M${x1},${yt} L${x1 + dx},${yt - dy} L${x1 + dx},${yb - dy} L${x1},${yb} Z`}
        fill="#2b1a14"
        opacity={0.16}
      />
      {/* Front face */}
      {LAYERS.map(([kind, from, to]) => (
        <rect
          key={'front' + from}
          x={x0}
          y={rowY(to)}
          width={width}
          height={rowY(from) - rowY(to)}
          fill={kind === 'sponge' ? spongeColor : fillColor}
        />
      ))}
      <rect x={x0} y={yt} width={width} height={height} fill="none" stroke="#2b1a14" strokeOpacity={0.12} />
      {/* Frosted top */}
      <path
        d={`M${x0},${yt} L${x1},${yt} L${x1 + dx},${yt - dy} L${x0 + dx},${yt - dy} Z`}
        fill={CREAM}
        stroke={CREAM_EDGE}
      />
      {Array.from({ length: Math.round(width / 12) }, (_, i) => (
        <circle
          key={i}
          cx={x0 + 6 + i * ((width - 12) / (Math.round(width / 12) - 1))}
          cy={yt}
          r={3.2}
          fill={PIPING}
          stroke={CREAM_EDGE}
          strokeWidth={0.8}
        />
      ))}
      {design === 'custom' && <Flowers cx={x0 + dx * 0.8 + width / 2} cy={yt - dy * 0.75} spread={width * 0.32} />}
      <Writing x={x0 + dx * 0.35 + width / 2} y={yt - dy * 0.22} maxWidth={width * 0.75} message={message} />
    </g>
  )
}

/** Piped cream dots around the top edge of a round tier, front half only. */
function Piping({ cx, cy, rx, ry }: { cx: number; cy: number; rx: number; ry: number }) {
  const count = Math.max(9, Math.round(rx / 6))
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const angle = Math.PI * (i / (count - 1))
        return (
          <circle
            key={i}
            cx={cx + Math.cos(angle) * rx * 0.97}
            cy={cy + Math.sin(angle) * ry * 0.97}
            r={3.2}
            fill={PIPING}
            stroke={CREAM_EDGE}
            strokeWidth={0.8}
          />
        )
      })}
    </g>
  )
}

/** Custom designs: a few sugar roses at the back of the top. */
function Flowers({ cx, cy, spread }: { cx: number; cy: number; spread: number }) {
  const spots = [-1, -0.35, 0.35, 1].map(f => ({ x: cx + f * spread, y: cy + Math.abs(f) * 2 }))
  return (
    <g>
      {spots.map((s, i) => (
        <g key={i}>
          <ellipse cx={s.x - 5} cy={s.y + 2} rx={5} ry={2.4} fill="#7d9b5a" />
          <circle cx={s.x} cy={s.y} r={5.5} fill={i % 2 ? '#e7a3ad' : '#d9707f'} />
          <circle cx={s.x} cy={s.y} r={2.4} fill={i % 2 ? '#d9707f' : '#b84f61'} opacity={0.8} />
        </g>
      ))}
    </g>
  )
}

/** The writing piped on top, in the brand red, squeezed to fit the top if it is long. */
function Writing({ x, y, maxWidth, message }: { x: number; y: number; maxWidth: number; message: string }) {
  const text = message.trim()
  if (!text) return null
  const fontSize = 11
  const estimate = text.length * fontSize * 0.52
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontSize={fontSize}
      fill="#a3201c"
      style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
      {...(estimate > maxWidth ? { textLength: maxWidth, lengthAdjust: 'spacingAndGlyphs' } : {})}
    >
      {text}
    </text>
  )
}
