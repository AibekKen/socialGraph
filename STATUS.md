# Current status

_Last updated: 2026-08-14. This file tracks in-flight work across sessions —
update or trim it as things land, don't let it grow stale._

## Standing rule for this project

**Never `git add`/`commit`/`push` without asking first.** Always finish the
work, run `npm run build`, compile a short change-report, and explicitly ask
for confirmation before touching git. This applies even after many small
verified edits — don't batch silently toward an assumed push.

## Uncommitted work (as of last check)

```
 M src/app/graph/page.tsx
 M src/app/page.tsx
 M src/app/profile/page.tsx
```

Everything else from the recent redesign push (icon.svg, favicon removal,
login/signup headline field, auth callback headline merge) is already
committed (`ec3c1cb`).

### What's in the uncommitted diff

- **`src/app/page.tsx`** — full landing-page rebuild: "Круг доверия" branding,
  hexagon logo mark, `NetworkPreview` SVG illustration (searching "фотограф",
  highlights a matched specialist among friends-of-friends), 3-bullet value
  prop (user / specialist / network-effect, no "Вам:"/"Специалистам:" prefixes),
  full-viewport layout (no card container), mobile fits without scroll
  (`h-dvh overflow-hidden`), desktop allowed to scroll (`md:overflow-visible`).
- **`src/app/graph/page.tsx`** — Круг доверия branding in header; copy-link
  "Скопировано ✓" feedback; 44px touch targets on header buttons and search
  input (mobile); onboarding banner for empty networks; removed logout button
  (moved to profile); "+ Контакт" header button hidden on mobile (kept desktop);
  two `text-gray-400` → `text-gray-500` contrast fixes.
- **`src/app/profile/page.tsx`** — added "Выйти" (logout) button below Save;
  three `text-gray-400` → `text-gray-500` contrast fixes on privacy captions.

## Known open item

The landing-page illustration (`NetworkPreview` in `src/app/page.tsx`) was
made full-width (`className="mx-auto h-auto w-full"`, no `md:` cap) to
satisfy "make it as large as possible." This fits perfectly on mobile
(375×812, verified via `scrollHeight === innerHeight`) but causes ~125px of
vertical overflow on desktop (1280×900: `scrollHeight` 1025 vs `innerHeight`
900 — the "Зарегистрироваться" button gets cut near the fold before scrolling).

User confirmed ("да") they want this fixed before pushing: **add a `md:`
width cap** to the SVG's className (e.g. `md:max-w-md`, exact value TBD by
testing) so desktop no longer needs to scroll, while leaving mobile's
uncapped full-width behavior untouched. Not yet implemented — this is the
next step before compiling the change-report and asking to push.

## Verification checklist for the open item (and any future layout change)

1. Edit `NetworkPreview`'s className in `src/app/page.tsx`.
2. `npm run build` — must stay clean.
3. Browser tool at 375×812 (mobile): confirm `scrollHeight === innerHeight`
   (still no scroll — this behavior must not regress).
4. Browser tool explicitly resized to 1280×900 (desktop; the "desktop" preset
   alone can land below the 768px `md:` breakpoint): confirm `scrollHeight`
   no longer exceeds `innerHeight`.
5. Only then: summarize the full accumulated diff and ask before `git commit`.
