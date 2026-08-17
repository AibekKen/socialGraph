# Architecture

## Stack

- **Next.js 16 (App Router, TypeScript)**, React 19, Tailwind CSS v4.
- **Supabase**: Postgres + Auth (email + Google OAuth) + Storage (avatars),
  accessed via `@supabase/ssr`. Row Level Security enforces almost all access
  control — see `supabase/schema.sql`.
- **Graph rendering**: `react-force-graph-2d` / `react-force-graph-3d`
  (d3-force under the hood) in `src/components/ContactGraph.tsx` /
  `ContactGraph3D.tsx`.
- Node version pinned via nvm — always run
  `export PATH="/Users/aibek/.nvm/versions/node/v24.4.1/bin:$PATH"` before
  `npm` commands in a fresh shell.

## Directory map

```
src/app/
  page.tsx                 landing page (logged-out visitors; redirects to /graph if authed)
  login/, signup/           auth pages
  auth/callback/route.ts    OAuth callback, merges user_metadata into profiles
  graph/page.tsx            main app screen: graph view, search, invites, notifications (~825 lines)
  profile/page.tsx          edit profile, privacy toggles, avatar upload, logout
  invite/[token]/page.tsx   invite acceptance landing
  legal/privacy/page.tsx    privacy policy page
  api/avatar/route.ts       CORS-proxy for avatar images (used by mock/placeholder photos)
  icon.svg                  favicon / app mark (hexagon-of-nodes logo)

src/components/
  ContactGraph.tsx           2D force-graph renderer (canvas), node/link styling logic
  ContactGraph3D.tsx          3D variant

src/lib/
  graphData.ts               data-fetching/shaping layer: queries Supabase, builds graph nodes/edges
  mockGraph.ts                mock data (dev/demo fallback)
  phone.ts                    phone number input mask
  supabase/client.ts           browser Supabase client
  supabase/server.ts           server Supabase client (cookie-based, SSR)

src/middleware.ts             route protection: redirects unauth'd users away from
                               /graph, /profile; redirects auth'd users away from /login, /signup

supabase/
  schema.sql                  full baseline schema + RLS (source of truth if starting fresh)
  002...007_*.sql              incremental migrations, applied in order after schema.sql
```

## Data model (Postgres)

- `profiles` (1:1 with `auth.users`) — name, headline, avatar, contacts,
  privacy flags (`share_contacts`, `visible_in_search`, `network_visible`).
- `connections` — one row per acquaintance link, `requester_id` →
  `addressee_id`, `status`: `pending | confirmed | declined`. Adding someone
  creates a `pending` row that's already publicly visible (see PROJECT.md —
  "one-sided add = public recommendation"); the addressee can `confirm` or
  `decline` (decline deletes visibility for everyone).
- `reviews` — rating/comment tied to a specific `connection_id`; can only be
  left if that connection is `confirmed`.
- `invites` — token-based invite for people not yet registered; `accept_invite(token)`
  RPC (SECURITY DEFINER) converts it into a `pending` connection on signup.
- `skills` / `profile_skills` — normalized specialization tags (exists in
  schema; UI currently favors free-text `headline` + `list_headlines()`
  autocomplete over the tags table).

### Key RPCs (all SECURITY DEFINER, `search_path = public`)

- `find_path(from_id, to_id)` — BFS over confirmed connections, depth ≤ 6,
  returns the node-id path. Powers "how am I connected to this match".
- `get_public_profiles(ids[])` / `search_profiles(q)` — masked profile reads;
  contact fields are `null`ed server-side unless `share_contacts = true`.
- `list_headlines()` — distinct existing headline values, for the profile
  form's autocomplete (free text still allowed).
- `accept_invite(token)` — turns an invite into a connection, run as the
  invitee but acting with the inviter's authority.

RLS is the actual privacy boundary — client-side flags are UI-only sugar; if
you add a new profile field, decide explicitly whether it needs masking in
`get_public_profiles`/`search_profiles` before exposing it in the UI.

## Auth flow

`src/middleware.ts` gates `/graph` and `/profile` (redirect to `/login` if
unauthenticated) and gates `/login`/`/signup` (redirect to `/graph` if
already authenticated). `src/app/page.tsx` (landing) does its own
server-side check and redirects authed users to `/graph` — it is the only
public marketing surface for logged-out visitors.

## Dev workflow

```bash
export PATH="/Users/aibek/.nvm/versions/node/v24.4.1/bin:$PATH"
npm run dev      # start dev server
npm run build    # verify before considering any change "done"
npm run lint
```

If the dev server appears to have silently died mid-session:
```bash
nohup npm run dev > /tmp/sgt-dev.log 2>&1 & disown
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
```

## Testing conventions used in this project

- No automated test suite yet — verification is `npm run build` (must stay
  clean) plus manual check via the Browser tool at both mobile (375×812) and
  an explicitly-resized desktop viewport (1280×900 — the tool's "desktop"
  preset can resolve below Tailwind's 768px `md:` breakpoint, so don't trust
  it without an explicit resize).
- For layout/overflow bugs, don't trust the (scaled) screenshot alone —
  cross-check with `document.documentElement.scrollHeight` vs
  `window.innerHeight` via the JS tool.
