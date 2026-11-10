# Light card

A lighting-control card whose light follows the time of day. It blends continuously from dawn to night: a peach sun rising with rays, a full sun at midday, a red sunset, then a sleeping moon under stars.

- Follows the viewer's local clock, or pass `hour` (0–24) to control it
- Dawn → night scrubber and a "play sunrise" time-lapse
- The face reacts: eyes follow the pointer, blink by day, sleep at night, and startle when poked
- Respects `prefers-reduced-motion`

## Run

```bash
npm install
npm run dev   # http://localhost:5180
```

`?t=18.5` pins the page to an hour.

## Use

```tsx
import { TimeLightCard } from './light/TimeLightCard'

<TimeLightCard />            // follows the clock
<TimeLightCard hour={18.5} name="my workspace" />
```

Copy `src/light`, the `light-*` and `day-scrub` rules in `src/index.css`, and `public/fonts`. The keyframes for the day live in `src/light/daylight.ts`.

Built with React, Vite and Tailwind CSS. Typeface: Geist (SIL Open Font License).
