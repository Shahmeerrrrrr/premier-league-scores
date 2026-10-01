# UI_UPGRADE.md — Visual polish + cheeky banner

> **Paste this entire file into your AI IDE (Antigravity) as the task prompt.**
> Two upgrades to the existing Premier League Scores app, both frontend-only.
> Do not change any backend code, API calls, or app functionality — this is
> pure visual flavour on top of what already works.
>
> Existing frontend files (read them first):
> `frontend/src/App.jsx`, `frontend/src/api.js`, `frontend/src/styles.css`,
> `frontend/src/components/Crest.jsx`, `MatchCard.jsx`, `MatchdayNav.jsx`,
> `frontend/src/components/StandingsTable.jsx`.
>
> NOTE: A previous Part B (3D LEGO minifig cursor follower) did not work out
> and is officially dropped. If any of its files exist (e.g. a `MiniFig.jsx`
> component), delete them. If `three` was added to `package.json`, remove the
> dependency (`npm uninstall three`) to keep the bundle lean.

---

## Part A — UI depth and shading polish

The app works and looks decent, but surfaces are flat. Add depth with shading
while keeping the dark theme (`#0a0a0b` page background, light text, no white
screens, no light mode).

Concrete changes (edit `styles.css` and component classNames as needed):

1. **Layered surfaces.** Page background stays near-black. Cards (`MatchCard`,
   table container, nav pills) get: background `#141417`, 1px border
   `rgba(255,255,255,0.06)`, an inset top highlight
   (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.05)`), and a soft drop shadow
   (`0 8px 24px rgba(0,0,0,0.45)`). Surfaces should read as stacked layers,
   not flat rectangles.
2. **Hover lift.** Interactive cards/rows: on hover, `translateY(-2px)`, deepen
   the shadow, brighten the border to `rgba(255,255,255,0.12)`. Transition
   `150–200ms ease`. No layout shift — use transforms only.
3. **Accent color.** Use Arsenal red (`#ef0107`) sparingly and consistently:
   active nav pill, the LIVE badge, table zone legend markers, focus rings.
   Everything else stays neutral.
4. **MatchCard.** Bigger, bolder scoreline typography; team names slightly muted
   by comparison. LIVE badge: red, with a soft pulsing glow animation
   (box-shadow pulse, not just opacity blink).
5. **StandingsTable.** Zone tints (top 4 / 5th / bottom 3) as subtle vertical
   gradients on the position cell, not flat color blocks. Row hover highlight.
   Sticky table header on scroll. Keep the legend.
6. **MatchdayNav.** Pill buttons with the layered-surface treatment; the current
   matchday label gets the red accent.
7. **Typography rhythm.** One clear hierarchy: scores/results largest, team
   names medium, kickoff times and secondary info muted (`rgba(255,255,255,0.55)`).
8. **Motion.** All hover/expand transitions eased, 150–250ms. Wrap decorative
   animations in `@media (prefers-reduced-motion: reduce)` to disable them.
9. **Empty/error/loading states** keep working exactly as now — only their
   styling may be touched to match the new surfaces.

Do not rename components, change props, or alter data flow. If a component's
structure fights the styling, adjust the CSS first and only then make minimal
JSX class changes.

---

## Part B — Cheeky scrolling banner under the navbar

Add a full-width banner strip in the normal document flow, directly beneath
the header/navbar, that scrolls cheeky Arsenal banter from right to left on an
infinite loop — like a stadium banner or a plane-towed ad, minus the plane.

### Rules (non-negotiable)

- **In-flow, never overlapping.** The banner is a normal block element under
  the nav (`~36–40px` tall). It pushes content down like any other element —
  it must never float over or hide page content.
- **Pure CSS motion.** Infinite marquee via CSS `@keyframes` translating
  `translateX(0 → -50%)` on a duplicated content track. No JS animation loop,
  no libraries.
- **Pause on hover.** `animation-play-state: paused` when the user hovers the strip.
- **Reduced motion.** Under `@media (prefers-reduced-motion: reduce)`, the
  animation is disabled and the messages render as a static centered line.
- **Editable messages.** The message list lives as a plain array constant at
  the top of the component file so the owner can change the banter in seconds.

### Implementation

1. New file `frontend/src/components/Banner.jsx`:
   - `const MESSAGES = [...]` at the top with defaults:
     `"ARSENAL IS BETTER"`, `"LONDON IS RED"`, `"NORTH LONDON FOREVER"`,
     `"COME ON YOU GUNNERS"` — cheeky, no profanity, nothing hateful.
   - Render the messages joined with a text separator (` • `), duplicated twice
     inside a track div for a seamless loop.
   - Render `<Banner />` in `App.jsx` directly below the header/nav.
2. CSS in `styles.css`:
   - Strip: dark background (`#101013`), thin red top and bottom borders
     (`1px solid #ef0107` at partial opacity), uppercase letter-spaced white
     text, ~13px font.
   - Track: `display: inline-flex; white-space: nowrap; animation: banner-scroll
     30s linear infinite;` with `@keyframes banner-scroll { to { transform:
     translateX(-50%); } }`. The outer strip has `overflow: hidden`.
   - Tune the duration so it reads briskly but readably (~30s per loop; adjust
     if messages are added).
3. No new npm dependencies.

### What NOT to do

- No plane graphic, no images, no emoji in the banner — text only.
- Do not make it fixed/sticky — it scrolls away with the page like normal content.
- Keep the banter cheeky but clean: rivalry jokes only, nothing abusive toward
  any group of people.

---

## Verification checklist (run before calling it done)

1. `npm run dev` — no console errors or warnings; backend untouched.
2. Matches view, table view, matchday nav, goal expansion all still work exactly
   as before (functionality unchanged).
3. Cards/table/nav show visible depth: layered shadows, hover lift, red accents
   on active nav + LIVE badge; no white screens anywhere.
4. The banner sits directly under the navbar, full width, ~36–40px tall, and
   scrolls messages right-to-left in an infinite seamless loop with no visible
   jump at the loop point.
5. Hovering the banner pauses the scroll; moving away resumes it.
6. The banner never overlaps page content — it occupies its own row in the layout.
7. With `prefers-reduced-motion` enabled (devtools rendering emulation), the
   banner is static.
8. No leftover minifig/three.js code or dependencies (`MiniFig.jsx` gone,
   `three` not in `package.json`).
9. `npm run build` succeeds.

## Constraints (repeat, non-negotiable)

- Frontend only. Dark theme only. No white backgrounds.
- Normal, descriptive naming — no corny names anywhere.
- Plain-English comments. No invented performance claims.
