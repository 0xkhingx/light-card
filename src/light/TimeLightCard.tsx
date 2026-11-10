import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { formatHour, sampleDay, useClockHour } from './daylight'

type Props = {
  /** Fractional hour (0–24) to render. Omit to follow the viewer's clock. */
  hour?: number
  name?: string
  tags?: string[]
  onEdit?: () => void
  className?: string
}

/** A circle with a gently scalloped edge, in a 100×100 box. */
const SCALLOP = (() => {
  const pts: string[] = []
  for (let i = 0; i < 360; i++) {
    const a = (i / 360) * Math.PI * 2
    const r = 46 * (1 + 0.035 * Math.cos(26 * a))
    pts.push(`${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`)
  }
  return `M${pts.join('L')}Z`
})()

// x %, y %, size cqw, twinkle delay s
const STARS = [
  [8, 55, 0.7, 0], [17, 67, 0.45, 1.2], [27, 52, 0.5, 2.1], [34, 78, 0.4, 0.4],
  [41, 60, 0.35, 2.8], [72, 54, 0.6, 0.6], [80, 70, 0.5, 1.8], [88, 58, 0.4, 3.3],
  [92, 84, 0.45, 2.6], [10, 88, 0.45, 0.9], [22, 93, 0.35, 1.6], [66, 90, 0.5, 2.2],
  [58, 51, 0.35, 3.1], [84, 95, 0.35, 0.2],
] as const

// moon craters, in the body's 100×100 box: cx, cy, r
const CRATERS = [[68, 36, 7.5], [72, 64, 5], [42, 74, 6], [27, 30, 4.5]] as const

const centered = { transform: 'translate(-50%, -50%)' } as const
const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export function TimeLightCard({
  hour,
  name = '0xkhingx workspace',
  tags = ['light', 'cabinet', 'scenario'],
  onEdit,
  className = '',
}: Props) {
  const clock = useClockHour()
  const h = hour ?? clock
  const day = sampleDay(h)
  const { moon } = day

  const rootRef = useRef<HTMLDivElement>(null)
  const [pokes, setPokes] = useState(0)
  const [awake, setAwake] = useState(false)
  const [hover, setHover] = useState(false)

  // A poke startles the light: eyes snap open for a moment (even the sleeping moon's).
  useEffect(() => {
    if (!pokes) return
    setAwake(true)
    const id = setTimeout(() => setAwake(false), 1100)
    return () => clearTimeout(id)
  }, [pokes])

  // The face rides the light, peeks over the horizon as it sinks, and is gone once it has set.
  const eyeX = lerp(45, 50.5, moon)
  const eyeY = Math.min(day.y - 3, 88)
  const open = awake ? 1 : day.open
  const eyeH = Math.max(open * 10.6, 1.3)
  const eyeOpacity = clamp01((117 - day.y) / 6)
  const blink = awake ? '' : day.open > 0.75 ? 'light-blink' : day.open > 0.3 ? 'light-blink-slow' : ''
  const look = awake ? 1.5 : 1.5 * clamp01(day.open * 1.4)
  // The moon is only "up" (craters, z's) once it has cleared the horizon.
  const moonUp = moon * clamp01((95 - day.y) / 15)
  // Rays fan out while the sun is near the horizon: strongest at sunrise and sunset.
  const rays = (1 - moon) * clamp01(1.4 - day.dark * 1.4) * clamp01((day.y - 90) / 12)
  const bodySize = 80 * 0.92 * day.size

  // Eyes follow the pointer. Written straight to CSS variables so moving the mouse never re-renders.
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = rootRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const dx = e.clientX - (r.left + (r.width * eyeX) / 100)
    const dy = e.clientY - (r.top + (r.height * eyeY) / 100)
    const d = Math.hypot(dx, dy) || 1
    const k = Math.min(d / (r.width * 0.25), 1)
    el.style.setProperty('--look-x', ((dx / d) * k).toFixed(3))
    el.style.setProperty('--look-y', ((dy / d) * k).toFixed(3))
  }
  const onPointerLeave = () => {
    rootRef.current?.style.setProperty('--look-x', '0')
    rootRef.current?.style.setProperty('--look-y', '0')
  }

  return (
    <div
      ref={rootRef}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={`relative aspect-[544/613] w-full overflow-hidden rounded-[8cqw] ${className}`}
      style={{
        ...day.vars,
        containerType: 'inline-size',
        background: 'linear-gradient(to bottom, var(--sky) 44%, var(--panel) 100%)',
        color: 'var(--ink)',
      }}
    >
      {/* ── the sky ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/* stars: the wrapper carries the fade so the twinkle animation can't override it */}
        <div className="absolute inset-0" style={{ opacity: clamp01(day.dark * 2 - 1) * 0.85 }}>
          {STARS.map(([x, y, s, delay], i) => (
            <span
              key={i}
              className="light-twinkle absolute rounded-full bg-white"
              style={{ left: `${x}%`, top: `${y}%`, width: `${s}cqw`, height: `${s}cqw`, animationDelay: `${delay}s` }}
            />
          ))}
        </div>

        {/* everything that rises: on first paint the light climbs up from below the horizon */}
        <div className="light-rise absolute inset-0">
          {/* haze keeps its size while the body grows and shrinks */}
          <div
            className="absolute left-[52%] size-[170cqw] rounded-full"
            style={{
              ...centered,
              top: `${day.y}%`,
              background:
                'radial-gradient(closest-side, var(--haze) 0%, color-mix(in oklab, var(--haze) 55%, transparent) 42%, transparent 100%)',
              opacity: lerp(1, 0.55, moon),
            }}
          />

          {/* sunrise / sunset rays */}
          <div className="absolute left-[52%] size-[165cqw]" style={{ ...centered, top: `${day.y}%`, opacity: rays * 0.6 }}>
            <div
              className="light-spin-back size-full rounded-full"
              style={{
                background:
                  'repeating-conic-gradient(from 0deg, color-mix(in oklab, var(--bloom) 55%, transparent) 0deg 4deg, transparent 4deg 15deg)',
                WebkitMaskImage: 'radial-gradient(closest-side, #000 38%, transparent 96%)',
                maskImage: 'radial-gradient(closest-side, #000 38%, transparent 96%)',
                filter: 'blur(0.8cqw)',
              }}
            />
          </div>

          {/* the body: scalloped sun by day, smooth cratered moon by night */}
          <div className="absolute left-[52%]" style={{ top: `${day.y}%`, transform: `scale(${day.size})` }}>
            <div
              key={pokes}
              className={pokes ? 'light-poke' : ''}
              style={{ transform: hover ? 'scale(1.04)' : 'scale(1)', transition: 'transform 0.35s cubic-bezier(0.3, 1.4, 0.5, 1)' }}
            >
              <div className="absolute size-[80cqw]" style={{ ...centered, filter: `blur(${lerp(1.7, 0.8, moon)}cqw)` }}>
                <svg viewBox="0 0 100 100" className="light-spin absolute inset-0 size-full" style={{ opacity: 1 - moon }}>
                  <path d={SCALLOP} fill="var(--bloom)" opacity="0.9" />
                </svg>
                <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" style={{ opacity: moon }}>
                  <circle cx="50" cy="50" r="46" fill="var(--bloom)" />
                </svg>
              </div>
              <div
                className="absolute size-[54cqw] rounded-full"
                style={{
                  transform: 'translate(-46%, -48%)',
                  filter: 'blur(3cqw)',
                  background: 'radial-gradient(closest-side, var(--core) 0%, var(--core) 30%, transparent 100%)',
                }}
              />
              <svg viewBox="0 0 100 100" className="absolute size-[80cqw]" style={{ ...centered, opacity: moonUp * 0.55 }}>
                {CRATERS.map(([cx, cy, r], i) => (
                  <circle key={i} cx={cx} cy={cy} r={r} fill="#b4bfee" />
                ))}
              </svg>
            </div>
          </div>

          {/* asleep */}
          <div
            className="absolute left-[64%] font-medium leading-none text-[#c9d2ff] transition-opacity duration-200"
            style={{ top: `${day.y - 19}%`, opacity: awake ? 0 : moonUp }}
          >
            <span className="light-float absolute left-0 top-[3.4cqw] text-[3.4cqw]">z</span>
            <span className="light-float absolute left-[3.4cqw] top-0 text-[4.8cqw]" style={{ animationDelay: '0.9s' }}>
              z
            </span>
          </div>

          {/* eyes */}
          <div
            className="absolute flex h-[10.6cqw] items-center"
            style={{
              left: `${eyeX}%`,
              top: `${eyeY}%`,
              opacity: eyeOpacity,
              transform: `translate(calc(-50% + var(--look-x, 0) * ${look}cqw), calc(-50% + var(--look-y, 0) * ${look}cqw)) rotate(14deg) scale(${lerp(1, 0.6, moon)})`,
              transition: 'transform 0.18s ease-out',
            }}
          >
            <div className={`flex items-center gap-[2.6cqw] ${blink}`}>
              {[0, 1].map((i) => (
                <span
                  key={i}
                  className="block w-[7.2cqw] rounded-full"
                  style={{ height: `${eyeH}cqw`, background: 'var(--eye)', transition: 'height 0.16s ease-out' }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="light-grain absolute inset-0 opacity-40" />
      </div>

      {/* poke target, sized to the sun / moon */}
      <button
        type="button"
        aria-label="Poke the light"
        onClick={() => setPokes((n) => n + 1)}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        className="light-hit absolute left-[52%] cursor-pointer rounded-full border-0 bg-transparent p-0"
        style={{ ...centered, top: `${day.y}%`, width: `${bodySize}cqw`, height: `${bodySize}cqw` }}
      />

      {/* ── the card ── */}
      <div
        className="absolute inset-x-0 top-0 flex h-[46.5%] flex-col justify-between rounded-[7.6cqw] px-[6.4cqw] pt-[5.4cqw] pb-[4.6cqw] font-sans text-[3.8cqw] leading-[1.3]"
        style={{
          background: 'var(--card)',
          // the hairline keeps the card's edge readable when the theme goes dark
          boxShadow:
            'inset 0 0 0 1px color-mix(in oklab, var(--ink) 7%, transparent), 0 0.2cqw 0.4cqw rgb(0 0 0 / 0.04), 0 1.4cqw 4.4cqw rgb(0 0 0 / 0.09)',
        }}
      >
        <div className="flex items-baseline justify-between gap-[3cqw] whitespace-nowrap" style={{ color: 'var(--muted)' }}>
          <span>{tags.join(' • ')}</span>
          <span className="shrink-0 tabular-nums">
            <span key={day.phase} className="light-swap inline-block">{day.phase}</span> {formatHour(h)}
          </span>
        </div>

        <div className="min-w-0">
          <h2 className="m-0 whitespace-nowrap text-[8.1cqw] font-normal leading-[1.2] tracking-[-0.035em]">{name}</h2>
          <div className="mt-[1.2cqw] flex items-baseline whitespace-nowrap">
            <span>color</span>
            <span
              key={pokes}
              className={`ml-[1.3cqw] inline-block size-[1.7cqw] translate-y-[-0.2cqw] rounded-full ${pokes ? 'light-ping' : ''}`}
              style={{ background: 'var(--dot)' }}
            />
            <span className="ml-[3cqw] tabular-nums">intensity: {day.intensity}%</span>
            <button
              type="button"
              onClick={onEdit}
              className="light-edit ml-auto cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-[length:inherit]"
              style={{ color: 'var(--muted)' }}
            >
              edit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
