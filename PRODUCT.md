# Product

## Register

product

## Users

**Students** use phones on campus to check in and out during class or at a work site. They need a fast, obvious flow: open the PWA, see today's status, tap check-in when GPS confirms they are on site. Context is often outdoors, bright light, limited patience for errors.

**Lecturers / instructors** review class attendance, see who is late or absent, and work from a desktop-friendly admin view during or after sessions.

**School administrators** set up campuses (geofences), users, classes, schedules, and one-off sessions. They are not developers; setup should read as a guided checklist, not a control panel.

## Product Purpose

Ella is a geofenced attendance PWA for schools and training sites. It verifies that check-ins happen inside configured GPS boundaries (Haversine), enforces daily and session rules, and gives admins visibility into attendance without manual roll call.

Success looks like: students complete check-in in seconds; admins trust the data; support burden stays low because errors explain what to do next (location, schedule, password).

## Brand Personality

**Trustworthy · Clear · Calm**

Voice is direct and reassuring, never salesy. Copy states the next action plainly. Visual design stays out of the way: the tool should feel as dependable as a well-run registrar's desk, not a consumer social app.

## Anti-references

- **Disorganized product UI:** inconsistent buttons, labels, or layouts screen to screen; crowded admin tables with no hierarchy; jargon that does not match how schools talk about students and classes.
- **Generic SaaS dashboards:** gradient hero cards, big metric grids, glass blur on chrome, decorative motion.
- **Category color reflexes:** "healthcare teal clinic," "crypto neon," or "observability dark blue" palettes chosen only because of the domain.
- **Gamified attendance:** streaks, badges, confetti, or playful illustration that undermines trust in records.
- **Dense ERP everywhere:** enterprise table density on mobile check-in flows.

## Design Principles

1. **Task first:** every screen answers what the user should do right now (check in, configure a campus, review today's marks).
2. **Trust through clarity:** show status, site, and time in plain language; errors say how to fix GPS, schedule, or auth issues.
3. **Mobile is primary:** touch targets, safe areas, and outdoor-readable light UI for student flows; admin can be denser on desktop.
4. **Earned familiarity:** reuse standard patterns (tabs, side nav, form controls) so fluent users are not relearning affordances.
5. **Calm restraint:** accent color marks primary actions and state; neutrals carry the rest.

## Accessibility & Inclusion

Target **WCAG 2.1 AA**: sufficient contrast on text and controls, visible focus rings, semantic alerts for errors and success, labels on all inputs.

Honor **prefers-reduced-motion** for animations. Student flows use at least 44px touch targets. Do not rely on color alone for status (pair badges with text). Geolocation failures must be readable without technical jargon.
