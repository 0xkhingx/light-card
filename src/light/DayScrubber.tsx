import { PHASES, PHASE_HOURS, formatHour, hourToPos, phaseAt, posToHour, sampleDay } from './daylight'

type Props = {
  /** Hour currently shown */
  hour: number
  /** True when following the real clock */
  live: boolean
  onChange: (hour: number) => void
  onLive: () => void
  /** True while the dawn → night time-lapse is running */
  playing: boolean
  onPlay: () => void
}

/** The whole day, dawn → night, painted along the track. */
const TRACK = (() => {
  const n = 36
  const stops = Array.from({ length: n + 1 }, (_, i) => `${sampleDay(posToHour(i / n - 1e-6)).swatch} ${((i / n) * 100).toFixed(1)}%`)
  return `linear-gradient(to right, ${stops.join(', ')})`
})()

/** Preview control: drag from dawn to night, jump to a phase, or return to the real time. */
export function DayScrubber({ hour, live, onChange, onLive, playing, onPlay }: Props) {
  const active = phaseAt(hour)

  return (
    <div className="text-[15px] leading-none" style={{ color: 'var(--muted)' }}>
      <div className="flex items-baseline justify-between">
        <div className="tabular-nums" style={{ color: 'var(--ink)' }}>
          <span className="text-[22px] tracking-[-0.02em]">{formatHour(hour)}</span>
          <span className="ml-2" style={{ color: 'var(--muted)' }}>{active}</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onPlay}
            aria-pressed={playing}
            className="flex cursor-pointer items-center gap-1.5 border-0 bg-transparent px-0 py-2 font-[inherit] transition-colors hover:text-[var(--ink)] active:translate-y-px"
            style={{ color: playing ? 'var(--ink)' : undefined }}
          >
            <svg viewBox="0 0 10 10" className="size-2.5" fill="currentColor" aria-hidden>
              {playing ? <path d="M1.5 1h2.5v8H1.5zM6 1h2.5v8H6z" /> : <path d="M2 0.8v8.4L9 5z" />}
            </svg>
            {playing ? 'pause' : 'play sunrise'}
          </button>
          <button
            type="button"
            onClick={onLive}
            disabled={live}
            className="flex cursor-pointer items-center gap-1.5 border-0 bg-transparent px-0 py-2 font-[inherit] transition-colors enabled:hover:text-[var(--ink)] enabled:active:translate-y-px disabled:cursor-default"
            style={{ color: live ? 'var(--ink)' : undefined }}
          >
            <span className={`size-1.5 rounded-full ${live ? 'light-twinkle' : ''}`} style={{ background: live ? 'var(--dot)' : 'currentColor' }} />
            {live ? 'live' : 'back to now'}
          </button>
        </div>
      </div>

      <div className="relative mt-3 h-[26px]">
        <div
          className="absolute inset-x-0 top-1/2 h-[10px] -translate-y-1/2 rounded-full"
          style={{ background: TRACK, boxShadow: 'inset 0 0 0 1px color-mix(in oklab, var(--ink) 10%, transparent)' }}
        />
        <input
          className="day-scrub absolute inset-0"
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={hourToPos(hour)}
          onChange={(e) => onChange(posToHour(Number(e.target.value)))}
          aria-label="Preview time of day, dawn to night"
          aria-valuetext={`${formatHour(hour)}, ${active}`}
        />
      </div>

      <div className="mt-1.5 grid grid-cols-6">
        {PHASES.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(PHASE_HOURS[p])}
            className="cursor-pointer border-0 bg-transparent px-0 py-2 text-center font-[inherit] text-[14px] transition-colors hover:text-[var(--ink)]"
            style={{ color: p === active ? 'var(--ink)' : undefined }}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}
