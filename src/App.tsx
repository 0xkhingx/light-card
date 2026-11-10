import { useEffect, useState } from 'react'
import { DayScrubber } from './light/DayScrubber'
import { TimeLightCard } from './light/TimeLightCard'
import { posToHour, sampleDay, useClockHour, useSmoothedHour } from './light/daylight'

/** `?t=18.5` opens the page pinned to that hour. */
const initialOverride = () => {
  const t = Number(new URLSearchParams(window.location.search).get('t') ?? NaN)
  return Number.isFinite(t) ? t : null
}

/** How long the dawn → night time-lapse takes. */
const PLAY_MS = 16_000

export default function App() {
  const clock = useClockHour()
  const [override, setOverride] = useState<number | null>(initialOverride)
  const [playing, setPlaying] = useState(false)
  const [showScrubber, setShowScrubber] = useState(true)

  const target = override ?? clock
  const hour = useSmoothedHour(target)
  const { vars } = sampleDay(hour)

  // "play sunrise": run the whole day from before dawn through to night, then stop.
  useEffect(() => {
    if (!playing) return
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = (now - start) / PLAY_MS
      if (p >= 0.93) {
        setPlaying(false)
        return
      }
      setOverride(posToHour(p))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  return (
    <main
      className="grid min-h-svh place-items-center px-4 py-10"
      style={{ ...vars, background: 'var(--page)' }}
    >
      <div className="w-full max-w-[27rem]">
        <TimeLightCard hour={hour} onEdit={() => setShowScrubber((s) => !s)} />
        <div
          className="mt-7 px-2 transition-[opacity,transform] duration-300"
          style={{
            opacity: showScrubber ? 1 : 0,
            transform: showScrubber ? 'none' : 'translateY(-6px)',
            visibility: showScrubber ? 'visible' : 'hidden',
          }}
        >
          <DayScrubber
            hour={target}
            live={override === null && !playing}
            onChange={(h) => {
              setPlaying(false)
              setOverride(h)
            }}
            onLive={() => {
              setPlaying(false)
              setOverride(null)
            }}
            playing={playing}
            onPlay={() => setPlaying((p) => !p)}
          />
        </div>
      </div>
    </main>
  )
}
