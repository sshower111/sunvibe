// Hand-drawn style line illustrations for the cake order flow (flavors and fillings).
// Same look as the cake shape drawings in public/illustrations: one even brown line, round ends, no fill.

type Props = { className?: string }
const Svg = ({ className, children }: Props & { children: React.ReactNode }) => (
  <svg
    viewBox="0 0 120 120"
    fill="none"
    stroke="currentColor"
    strokeWidth={3.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    {children}
  </svg>
)
const Dots = ({ points, r = 1.6 }: { points: [number, number][]; r?: number }) => (
  <>
    {points.map(([x, y]) => (
      <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="currentColor" stroke="none" />
    ))}
  </>
)

const strawberry = (dx = 0, dy = 0, s = 1) => (
  <g transform={`translate(${dx} ${dy}) scale(${s})`}>
    <path d="M60 40c-12-6-30-2-31 14 0 16 17 34 31 44 14-10 31-28 31-44-1-16-19-20-31-14z" />
    <path d="M60 40c-4-6-10-8-17-7 4 4 9 6 17 7zM60 40c4-6 10-8 17-7-4 4-9 6-17 7zM60 40c0-6 1-11 5-15" />
    <Dots
      points={[
        [48, 55],
        [60, 52],
        [72, 55],
        [44, 66],
        [55, 64],
        [66, 64],
        [76, 66],
        [52, 76],
        [63, 76],
        [58, 87],
      ]}
    />
  </g>
)
const banana = (dx = 0, dy = 0, s = 1) => (
  <g transform={`translate(${dx} ${dy}) scale(${s})`}>
    <path d="M28 38c2 30 22 50 56 46 8-1 12-6 10-10-28 4-46-10-52-38-1-4-4-6-8-5-3 1-6 3-6 7z" />
    <path d="M34 34l-2-8 7-1 2 7M92 74l6 2" />
    <path d="M38 46c6 18 20 30 40 32" />
  </g>
)

export const flavorArt: Record<string, (p: Props) => React.ReactNode> = {
  Vanilla: p => (
    <Svg {...p}>
      <path d="M24 100c18-20 36-38 58-52M34 104c18-20 38-36 58-48" />
      <path d="M82 48c4-2 8-2 10 0M92 56c3-1 6 0 7 2" />
      <path d="M50 50c-8-6-8-18 0-22 8 4 8 16 0 22z" />
      <path d="M50 50c4-10 16-12 22-6-4 8-14 10-22 6z" />
      <path d="M50 50c8 4 10 14 4 20-8-2-10-12-4-20z" />
      <path d="M50 50c-6 6-18 6-20-2 4-6 14-6 20 2z" />
      <path d="M50 50c-10-2-18-12-12-18" />
      <circle cx="50" cy="50" r="3.5" />
    </Svg>
  ),
  Chocolate: p => (
    <Svg {...p}>
      <path d="M30 28h60v52l-12 12H30z" />
      <path d="M30 49h60M30 70h48M50 28v64M70 28v52" />
      <path d="M78 80l4 4 8-4M84 96l6-6 6 4-6 6z" />
    </Svg>
  ),
  Coffee: p => (
    <Svg {...p}>
      <path d="M30 54h50v14c0 14-11 24-25 24S30 82 30 68z" />
      <path d="M80 60c10-2 14 4 12 10-2 6-8 8-14 6" />
      <path d="M20 96c16 6 54 6 72 0" />
      <path d="M44 44c-6-6 6-10 0-18M56 44c-6-6 6-10 0-18M68 44c-6-6 6-10 0-18" />
    </Svg>
  ),
  'Green Tea': p => (
    <Svg {...p}>
      <path d="M24 62h72c0 18-16 30-36 30S24 80 24 62z" />
      <path d="M46 92v6h28v-6" />
      <path d="M30 62c8-4 52-4 60 0" />
      <path d="M60 50c-4-14 4-26 22-30 4 16-6 28-22 30zM60 50c6-8 12-14 20-26" />
      <path d="M58 52c-10-6-24-4-30 6 10 6 22 4 30-6z" />
    </Svg>
  ),
  Orange: p => (
    <Svg {...p}>
      <circle cx="60" cy="62" r="32" />
      <circle cx="60" cy="62" r="25" />
      <path d="M60 62V37M60 62l18-18M60 62h25M60 62l18 18M60 62v25M60 62L42 80M60 62H35M60 62L42 44" />
      <path d="M60 30c2-8 8-12 16-12-2 8-8 12-16 12z" />
    </Svg>
  ),
  Pandan: p => (
    <Svg {...p}>
      <path d="M56 100c-10-24-24-50-36-74 18 18 30 42 40 72" />
      <path d="M60 100c0-28 2-56 6-84 6 28 4 56 0 84" />
      <path d="M64 100c10-22 22-44 38-64-10 24-22 46-32 66" />
      <path d="M30 40c8 14 16 30 24 52M66 30v58M90 50c-8 12-14 26-20 40" />
      <path d="M44 100h36" />
    </Svg>
  ),
}

export const fillingArt: Record<string, (p: Props) => React.ReactNode> = {
  'Mixed Fresh Fruit': p => (
    <Svg {...p}>
      <circle cx="44" cy="66" r="22" />
      <circle cx="44" cy="66" r="6" />
      <path d="M44 46v6M44 80v6M24 66h6M58 66h6M30 52l5 5M53 75l5 5M58 52l-5 5M35 75l-5 5" />
      {strawberry(42, 6, 0.55)}
      <circle cx="84" cy="88" r="8" />
      <circle cx="98" cy="80" r="7" />
      <path d="M82 82l3 3M96 75l3 3" />
    </Svg>
  ),
  Strawberry: p => <Svg {...p}>{strawberry(0, 2)}</Svg>,
  Banana: p => <Svg {...p}>{banana(0, 6)}</Svg>,
  'Strawberry Banana': p => (
    <Svg {...p}>
      {banana(-6, 14, 0.9)}
      {strawberry(30, -6, 0.6)}
    </Svg>
  ),
  Mango: p => (
    <Svg {...p}>
      <path d="M62 30c-22 0-38 18-36 40 2 18 18 28 34 26 22-2 34-22 32-40-2-16-14-26-30-26z" />
      <path d="M62 30c0-6 2-10 6-12M66 24c8-8 20-8 26-2-8 6-18 6-26 2z" />
      <path d="M42 62c4 12 14 20 26 20" />
    </Svg>
  ),
  Taro: p => (
    <Svg {...p}>
      <path d="M60 46c-20 0-32 14-32 28s14 24 32 24 32-10 32-24-12-28-32-28z" />
      <path d="M34 66c16 4 36 4 52 0M30 80c18 4 42 4 60 0M40 92c12 3 28 3 40 0" />
      <path d="M58 46c-2-10-8-18-18-22 0 10 8 18 18 22zM62 46c2-12 10-22 22-26 0 12-10 22-22 26z" />
    </Svg>
  ),
  Custard: p => (
    <Svg {...p}>
      <path d="M38 44h44l8 40H30z" />
      <path d="M38 44c0 8 4 12 8 6 2 10 8 10 10 2 2 8 8 8 10 0 2 8 8 8 10-2 4 6 6 2 6-6" />
      <path d="M18 88c16 8 68 8 84 0" />
      <path d="M58 44c0-6 4-10 10-10" />
    </Svg>
  ),
  Coconut: p => (
    <Svg {...p}>
      <circle cx="74" cy="44" r="22" />
      <circle cx="68" cy="38" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="78" cy="36" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="74" cy="46" r="2.6" fill="currentColor" stroke="none" />
      <path d="M16 66h72c0 20-16 32-36 32S16 86 16 66z" />
      <path d="M24 66c0 14 12 24 28 24s28-10 28-24" />
      <path d="M16 66c6-4 66-4 72 0" />
    </Svg>
  ),
  Durian: p => (
    <Svg {...p}>
      <path d="M60 32l6 6 8-2 2 8 8 2-2 8 8 6-6 6 4 8-8 4v8l-8-2-4 8-8-4-8 4-4-8-8 2v-8l-8-4 4-8-6-6 8-6-2-8 8-2 2-8 8 2z" />
      <path d="M60 32c0-8 4-12 10-14" />
      <path d="M48 56l4 4M64 52l4 4M54 70l4 4M70 68l4 4M42 72l4 4" />
    </Svg>
  ),
  'Something else (e.g., passion fruit)': p => (
    <Svg {...p}>
      <circle cx="60" cy="62" r="32" />
      <path d="M60 30c-4 10-14 20-28 24M60 30c4 10 14 20 28 24" />
      <circle cx="60" cy="68" r="20" />
      <Dots
        r={2.4}
        points={[
          [52, 62],
          [62, 58],
          [70, 66],
          [56, 74],
          [66, 76],
          [50, 70],
        ]}
      />
    </Svg>
  ),
}

/** "Not sure" / "Please recommend": a little question mark with sparkles. */
export const NotSureArt = (p: Props) => (
  <Svg {...p}>
    <path d="M44 46c0-12 8-18 18-18s18 6 18 16c0 12-18 14-18 28" />
    <circle cx="62" cy="90" r="3" fill="currentColor" stroke="none" />
    <path d="M26 30v12M20 36h12M94 70v10M89 75h10" />
  </Svg>
)
