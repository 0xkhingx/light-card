import { useEffect, useRef, useState, type CSSProperties } from 'react'

export type Phase = 'dawn' | 'morning' | 'day' | 'sunset' | 'dusk' | 'night'

export const PHASES: Phase[] = ['dawn', 'morning', 'day', 'sunset', 'dusk', 'night']

type Stop = {
  /** hour of day, 0–24 */
  h: number
  page: string
  card: string
  /** sky colour at the horizon (bottom of the card) */
  panel: string
  /** sky colour at the top */
  sky: string
  /** wide soft haze around the light */
  haze: string
  /** body of the sun / moon */
  bloom: string
  /** hot centre */
  core: string
  /** the "color" dot in the card */
  dot: string
  eye: string
  /** vertical centre of the light, % of card height */
  y: number
  size: number
  /** 0 = scalloped sun, 1 = smooth moon */
  moon: number
  intensity: number
  /** eye openness 0–1 */
  open: number
  /** 0 = light theme, 1 = dark theme */
  dark: number
}

const NIGHT = {
  page: '#07090f', card: '#151823', panel: '#10143a', sky: '#070a1a',
  haze: '#2a3a9a', bloom: '#e4e9ff', core: '#ffffff', dot: '#9fb0ff', eye: '#39407a',
  y: 71, size: 0.4, moon: 1, intensity: 6, open: 0, dark: 1,
}
/** Same night, but the moon is below the horizon (where it swaps with the sun unseen). */
const MOON_DOWN = { ...NIGHT, y: 122 }

/** The day as keyframes. Everything between two stops is blended. */
const STOPS: Stop[] = [
  { h: 0, ...NIGHT },
  { h: 4.4, ...NIGHT },
  { h: 5.2, ...MOON_DOWN },
  { // dawn: lavender sky, the sun just breaking the horizon
    h: 6, page: '#f4ecec', card: '#fffafa', panel: '#f8d9cf', sky: '#d7dcf0',
    haze: '#f9cfc6', bloom: '#ff9fa0', core: '#ff6f7d', dot: '#ff8f8f', eye: '#ffffff',
    y: 110, size: 0.85, moon: 0, intensity: 18, open: 0.25, dark: 0,
  },
  { // morning: pale blue sky, half-risen peach sun
    h: 8.5, page: '#fbf7f1', card: '#ffffff', panel: '#fde9d2', sky: '#e3eefa',
    haze: '#fde0bd', bloom: '#ffc38a', core: '#ff9d6e', dot: '#ffb37a', eye: '#ffffff',
    y: 99, size: 0.95, moon: 0, intensity: 45, open: 0.85, dark: 0,
  },
  { // midday: the whole sun, high and fully inside the card
    h: 13, page: '#fbfaf6', card: '#ffffff', panel: '#fdf3cf', sky: '#eaf4fb',
    haze: '#fdeeb0', bloom: '#ffdc5e', core: '#ffc21f', dot: '#ffcc33', eye: '#ffffff',
    y: 74, size: 0.6, moon: 0, intensity: 100, open: 1, dark: 0,
  },
  { // afternoon — the reference look
    h: 16, page: '#fbf9f5', card: '#ffffff', panel: '#fbeccb', sky: '#faf0dc',
    haze: '#fde2a8', bloom: '#ffc657', core: '#ff9a3d', dot: '#ffbf47', eye: '#ffffff',
    y: 88, size: 1, moon: 0, intensity: 64, open: 1, dark: 0,
  },
  { // sunset: lilac sky over a red-orange sun
    h: 18.5, page: '#f8efe8', card: '#fffaf6', panel: '#f9c4a4', sky: '#e6c3d6',
    haze: '#f7b09a', bloom: '#ff7d54', core: '#f2414f', dot: '#ff6a4a', eye: '#ffffff',
    y: 103, size: 1.08, moon: 0, intensity: 34, open: 0.45, dark: 0,
  },
  { // dusk: sun gone, afterglow on the horizon
    h: 19.75, page: '#1f1b2e', card: '#2a2540', panel: '#5a2c58', sky: '#1c1a38',
    haze: '#7a3a70', bloom: '#a04a8a', core: '#e0708a', dot: '#c06aa0', eye: '#ffffff',
    y: 118, size: 0.95, moon: 0, intensity: 14, open: 0.1, dark: 1,
  },
  { h: 20.6, ...MOON_DOWN },
  { h: 21.75, ...NIGHT },
  { h: 24, ...NIGHT },
]

/**
 * Where each phase starts. The scrubber gives every phase the same width,
 * so the short, colourful ones (dawn, sunset, dusk) get as much room as the long night.
 * The day runs dawn → night, starting at 05:00.
 */
const BOUNDS = [5, 7, 11, 17, 19.25, 20.75, 29]

/** Hours the phase buttons jump to. */
export const PHASE_HOURS: Record<Phase, number> = {
  dawn: 6,
  morning: 8.5,
  day: 13,
  sunset: 18.5,
  dusk: 19.75,
  night: 23,
}

const wrap = (hour: number) => ((hour % 24) + 24) % 24

export function phaseAt(hour: number): Phase {
  const h = wrap(hour - BOUNDS[0]) + BOUNDS[0]
  for (let i = 0; i < PHASES.length; i++) if (h < BOUNDS[i + 1]) return PHASES[i]
  return 'night'
}

/** Scrubber position (0–1) → hour of day. */
export function posToHour(pos: number) {
  const x = Math.min(Math.max(pos, 0), 1) * PHASES.length
  const i = Math.min(Math.floor(x), PHASES.length - 1)
  return wrap(BOUNDS[i] + (x - i) * (BOUNDS[i + 1] - BOUNDS[i]))
}

/** Hour of day → scrubber position (0–1). */
export function hourToPos(hour: number) {
  const h = wrap(hour - BOUNDS[0]) + BOUNDS[0]
  let i = 0
  while (i < PHASES.length - 1 && h >= BOUNDS[i + 1]) i++
  return (i + (h - BOUNDS[i]) / (BOUNDS[i + 1] - BOUNDS[i])) / PHASES.length
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const mix = (a: string, b: string, t: number) =>
  a === b || t <= 0 ? a : t >= 1 ? b : `color-mix(in oklab, ${a}, ${b} ${(t * 100).toFixed(2)}%)`

export type DaySample = {
  phase: Phase
  intensity: number
  open: number
  y: number
  size: number
  moon: number
  dark: number
  /** representative colour of this moment, for the scrubber track */
  swatch: string
  /** CSS custom properties to spread onto a wrapper element */
  vars: CSSProperties
}

export function sampleDay(hour: number): DaySample {
  const h = wrap(hour)
  let i = 0
  while (i < STOPS.length - 2 && h >= STOPS[i + 1].h) i++
  const a = STOPS[i]
  const b = STOPS[i + 1]
  const t = (h - a.h) / (b.h - a.h)

  const dark = lerp(a.dark, b.dark, t)
  const isDark = dark > 0.5
  const dot = mix(a.dot, b.dot, t)

  return {
    phase: phaseAt(h),
    intensity: Math.round(lerp(a.intensity, b.intensity, t)),
    open: lerp(a.open, b.open, t),
    y: lerp(a.y, b.y, t),
    size: lerp(a.size, b.size, t),
    moon: lerp(a.moon, b.moon, t),
    dark,
    swatch: dot,
    vars: {
      '--page': mix(a.page, b.page, t),
      '--card': mix(a.card, b.card, t),
      '--panel': mix(a.panel, b.panel, t),
      '--sky': mix(a.sky, b.sky, t),
      '--haze': mix(a.haze, b.haze, t),
      '--bloom': mix(a.bloom, b.bloom, t),
      '--core': mix(a.core, b.core, t),
      '--dot': dot,
      '--eye': mix(a.eye, b.eye, t),
      // Text flips rather than blends, so it never sits grey-on-grey mid-twilight.
      '--ink': isDark ? '#f3f2f7' : '#141416',
      '--muted': isDark ? '#8b8ea3' : '#a3a3a3',
    } as CSSProperties,
  }
}

export const formatHour = (hour: number) => {
  const total = Math.round(wrap(hour) * 60) % 1440
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

const hourOf = (d: Date) => d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600

/** The viewer's local time as a fractional hour, refreshed every 15s. */
export function useClockHour() {
  const [hour, setHour] = useState(() => hourOf(new Date()))
  useEffect(() => {
    const id = setInterval(() => setHour(hourOf(new Date())), 15_000)
    return () => clearInterval(id)
  }, [])
  return hour
}

/** Glides toward `target` around the clock by the shortest way, so jumps sweep through the day. */
export function useSmoothedHour(target: number) {
  const [value, setValue] = useState(target)
  const current = useRef(target)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      current.current = target
      setValue(target)
      return
    }
    let raf = 0
    const step = () => {
      const delta = ((target - current.current + 36) % 24) - 12
      if (Math.abs(delta) < 0.004) {
        current.current = target
        setValue(target)
        return
      }
      current.current = (current.current + delta * 0.12 + 24) % 24
      setValue(current.current)
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target])

  return value
}
