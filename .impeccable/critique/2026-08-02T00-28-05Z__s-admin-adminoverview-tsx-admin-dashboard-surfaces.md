---
target: admin dashboard surfaces (AdminUsersManager, SessionManager, AdminOverview)
total_score: 26
p0_count: 0
p1_count: 2
timestamp: 2026-08-02T00-28-05Z
slug: s-admin-adminoverview-tsx-admin-dashboard-surfaces
---
⚠️ DEGRADED: single-context (this harness restricts spawning the Agent/Task tool to explicit user request; the user asked for a critique, not for sub-agent orchestration, so Assessment A and Assessment B ran sequentially in one context instead of two isolated sub-agents)

### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | "Marks today" stat can silently undercount (see P2 below); otherwise good toasts/skeletons |
| 2 | Match Between System and Real World | 4 | Plain language throughout, matches the "not developers" admin persona well |
| 3 | User Control and Freedom | 2 | No undo/confirm on Reset Password; lost setup codes have no recovery path |
| 4 | Consistency and Standards | 2 | Three different confirmation treatments for comparably destructive actions across two files |
| 5 | Error Prevention | 2 | No confirm on Reset Password; no client-side end>start check; no past-date guard on sessions |
| 6 | Recognition Rather Than Recall | 3 | Edit pre-fill is good, but no scroll-to-form and no "done" state on the setup checklist |
| 7 | Flexibility and Efficiency | 2 | CSV bulk import is a real power path; no bulk unlock/reset, no copy-code-only |
| 8 | Aesthetic and Minimalist Design | 3 | Clean, on-token, restrained after the side-stripe/off-palette fix |
| 9 | Error Recovery | 2 | Error toasts are specific and jargon-free; but no recovery for a lost one-time setup code |
| 10 | Help and Documentation | 3 | AdminHelpCard used well in two of three surfaces; SessionManager has none |
| **Total** | | **26/40** | **Acceptable — functional and on-brand, but real consistency/error-prevention gaps** |

### Anti-Patterns Verdict

**Start here.** Does this look AI-generated? **No** — this reads as a deliberately restrained internal tool. Restrained wine/navy palette, segmented stat row instead of a 4-up metric-card grid, no gradient text, no decorative motion, plain-language copy matching the "school admin, not a developer" brief in PRODUCT.md.

**LLM assessment**: The one thing that *did* read as an AI-slop tell — a `border-l-4` side-stripe accent on the "classes in session now" callout, paired with an off-palette `bg-green-500` pulsing dot that also ignored `prefers-reduced-motion` — was caught and fixed before this critique ran (via the bundled detector). With that gone, nothing else in these three files pattern-matches the standard tells.

**Deterministic scan**: `detect.mjs` against `AdminUsersManager.tsx`, `SessionManager.tsx`, `AdminOverview.tsx` — **0 findings** (clean after the fix above).

**Visual overlays**: Not available for this run. Live-browser inspection would require authenticating into the app's real MongoDB-backed admin account, and no admin credentials are configured in this environment — I chose not to run `create-admin` or otherwise mutate a live database just to take screenshots for a critique. This critique is source-only; treat layout claims below as read from JSX/Tailwind, not confirmed pixel-for-pixel in a browser.

### Overall Impression

Functional, on-brand, and free of the obvious AI tells. The gap is that this session bolted a genuinely new, security-sensitive flow (one-time setup codes) and a new destructive action (cancel session) onto existing patterns without settling on one shared standard for "how do we show a secret once" and "how do we confirm something irreversible." Right now there are three different answers to the first question and three different answers to the second, inside the same three files. The biggest opportunity: pick one confirmation pattern and one secret-reveal pattern, then apply both everywhere.

### What's Working

- **The CSV-import results table is the strongest piece of new UI here.** Per-row status + setup code in a persistent, scrollable table is exactly right for a bulk operation — nothing gets lost, nothing overwhelms.
- **Session create/edit correctly reuses one form** instead of reaching for a modal (the product register explicitly warns against "modal as first thought") — editingId swaps the form between create and edit cleanly, with a "Cancel edit" escape hatch.
- **Status is never color-only.** `ella-chip-success` / `-warning` / `-danger` / `-neutral` always pair a color with a text label across all three files — matches PRODUCT.md's explicit accessibility mandate.

### Priority Issues

**[P1] One-time setup codes vanish with no recovery path**
- **Why it matters**: The `lastSetupCode` panel in AdminUsersManager is plain component state — a page refresh, an accidental navigation, or adding a second person wipes it. PRODUCT.md is explicit that admins here "are not developers" and setup should read as a guided checklist; a non-technical admin adding several students in a row will lose earlier codes with nothing beyond a one-line caption ("it only shows once") as warning. The CSV-import path already solves this correctly (persistent results table); the single-add path doesn't.
- **Fix**: Persist recently-issued codes (e.g. `sessionStorage`, keyed by studentId) so they survive a refresh within the session, or keep a running "codes issued this session" list instead of overwriting `lastSetupCode` on every create/reset.
- **Suggested command**: `/impeccable harden`

**[P1] Destructive actions have three different (or no) confirmations**
- **Why it matters**: "Reset password" in AdminUsersManager fires immediately on click with zero confirmation, even though it instantly invalidates the person's working password. "Cancel session" in SessionManager uses a native `window.confirm()`. Same class of action (irreversible, invalidates existing state), two files, two different safeguards, and the one that exists breaks the app's own crafted visual language with unstyled browser chrome.
- **Fix**: Standardize on one in-app confirmation pattern (styled, matching DESIGN.md's calm register) and apply it to both Reset Password and Cancel Session.
- **Suggested command**: `/impeccable harden`

**[P2] "Marks today" can silently undercount**
- **Why it matters**: This isn't a UI polish issue, it's a data-correctness bug surfaced directly on the number the admin trusts most — PRODUCT.md's stated success metric is literally "admins trust the data." The stat is computed by fetching `/api/attendance?limit=100` (most recent 100 records of any type/day) and filtering client-side to today. Once a campus produces more than 100 attendance records recently, today's true count can fall outside that window and the tile quietly reports low. This needs an engineering fix (a day-scoped count on the server), not a design-system change — flagging it here because it lives on the surface being critiqued.
- **Fix**: Compute "marks today" server-side from a `dayKey`-filtered count, not a client-side filter over a capped recent-records fetch.
- **Suggested command**: none of the standard `/impeccable` commands cover data correctness — this needs a direct code fix, happy to do it if you want.

**[P2] Editing a session doesn't bring the form into view**
- **Why it matters**: Clicking "Edit" on a row anywhere in the session table repopulates the form at the top of the page with no scroll or highlight. On a list with more than a screenful of sessions, an admin who clicks Edit near the bottom won't see anything change — the form update happens off-screen. This is the "Hidden Navigation" cognitive-load pattern: the admin has to already know to scroll up.
- **Fix**: `scrollIntoView({ behavior: "smooth" })` on the form when `startEdit` fires (respecting reduced-motion), or a brief highlight state on the form card.
- **Suggested command**: `/impeccable polish`

**[P2] The Setup checklist never reflects progress**
- **Why it matters**: All four "Setup checklist" steps on the Overview page render identically whether or not the school has already added campuses, students, and classes. Framed as a checklist, but nothing is ever checked. For a returning admin post-setup, four permanent "do this" cards below the stats read as noise rather than a completed milestone.
- **Fix**: Mark completed steps (checkmark + muted treatment), and consider collapsing the whole block once all four are done.
- **Suggested command**: `/impeccable onboard`

### Persona Red Flags

**Jordan (First-Timer admin — the explicit primary persona per PRODUCT.md)**: Adds a student, gets the setup code, gets a phone call, comes back and adds a second student — the first code is now gone with no warning beyond a caption they likely didn't register as consequential. This is the single highest-risk moment for this exact persona: PRODUCT.md's stated goal is "support burden stays low," and this flow is a direct path to a support ticket ("I lost the code, what do I do") that Reset Password can fix, but only if the admin realizes that's the escape hatch.

**Alex (Power User)**: CSV import is the correct power path and works well. But the students table has no multi-select — if a batch of accounts gets locked simultaneously (shared default password pattern, a common real-world failure mode this app's own lockout feature is designed to catch), Alex unlocks one row at a time with no bulk action.

**Sam (Accessibility-dependent)**: Status badges consistently pair color with text — solid. Table headers (`<th>`) have no `scope="col"`, a minor screen-reader table-navigation gap. More significant: the setup-code panel has no `aria-live` region, so a screen-reader user who just submitted "Add a new person" isn't automatically told a critical, one-time value appeared on screen — they'd need to explicitly navigate to find it, compounding the P1 above.

### Minor Observations

- `SessionManager.tsx` has no `AdminHelpCard` equivalent to the one used in Users and Overview — a one-line "why sessions exist" note in the page intro substitutes for it, which is fine, but it's the one surface of the three without the shared help-card pattern.
- No client-side check that a session's end time is after its start time before submit — the server catches it, but only after a round trip.
- `datetime-local` inputs for session start/end have no `min` attribute, so a session can be scheduled entirely in the past with no warning until it silently renders "Scheduled / ended."
- The one-time-secret display pattern differs visually across three contexts (dedicated bordered panel on Users; embedded table cell on CSV import; bordered box on the student's own Profile page from earlier this session). Not wrong, but there's no shared "this is a secret, shown once" visual language tying them together.

### Questions to Consider

- What should happen to a setup code the admin never got to use — should the app compute a `sessionStorage`-backed "codes issued this session" list, or is a `/dashboard/admin/audit`-style "recent codes" screen worth having?
- Is a native `window.confirm()` acceptable anywhere in this app, or should every destructive action route through one styled in-app confirmation component?
- Does "Setup checklist" need to persist completion state at all, or is a simpler fix just hiding it entirely once real data exists (campuses > 0 and students > 0)?
