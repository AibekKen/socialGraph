# Senim (Круг доверия)

Trust-graph social network for finding specialists (photographers, contractors,
repairmen, etc.) through people you actually know — not anonymous reviews or ads.
Target market: Kazakhstan / CIS. Solo-developer project, small budget.

## The idea

Reviews and ad-driven directories are easy to fake or game. Word-of-mouth
recommendations from people you trust are not — but they don't scale past
your immediate circle. This app makes word-of-mouth searchable: build your
contact graph, and when you search for a specialist, the app finds them
through your network (friends, friends-of-friends) and shows you *how* you're
connected, so the recommendation is traceable to a real person you trust.

## Core mechanics

- **Graph, not a feed.** Contacts are nodes; confirmed/pending acquaintance
  links are edges. Users visually explore who they (and their contacts) know.
- **One-sided add = public recommendation.** Adding someone is not a "friend
  request" — it's "I know and vouch for this person," visible immediately
  (pending), not gated on the other side accepting. Privacy is handled by
  letting the *addressee* decline (which erases the connection for everyone)
  and by a `network_visible` flag that lets a user hide their outgoing
  connections from third parties.
- **Search highlights matches in the graph.** Searching a specialty (e.g.
  "фотограф") surfaces matching people and highlights the shortest path from
  "you" to them through confirmed connections (`find_path` RPC, breadth
  search capped at depth 6).
- **Contact info is masked by default.** Phone/WhatsApp/Instagram are only
  exposed through `get_public_profiles`/`search_profiles` when the owner has
  `share_contacts = true`; direct table access never leaks them.
- **Invites for people not yet on the platform.** Inviter generates a link
  (shared manually via WhatsApp/SMS/Instagram — no paid SMS/API integration),
  which on acceptance creates a pending connection via a SECURITY DEFINER RPC
  (`accept_invite`).

## Value proposition (landing page, 3 bullets, in priority order)

1. **For the searcher** — "Только настоящие рекомендации": recommendations
   trace back to a real person you know, not a random review.
2. **For the specialist** — "Больше доверия — больше клиентов": being
   embedded in more circles of trust drives repeat/loyal clients.
3. **Shared network effect** — "Поделились раз — помогаете постоянно":
   sharing a specialist once keeps generating value for your circle over time.

## Marketing positioning

Content and messaging should center on **protection from being scammed /
getting a bad specialist** via trusted recommendations — not on any single
vertical (e.g. not framed as a "ПДД" or driving-lessons app). Keep copy
generic across specialist types.

## Non-goals / deliberately out of scope (for now)

- No paid SMS/WhatsApp API integration — invites are shared manually by the
  inviter via a generated link.
- No public reviews/ratings feed as the primary surface — reviews exist
  (`reviews` table) but are secondary to the graph/search experience.
- No algorithmic ranking beyond "shortest confirmed path" + text match.
