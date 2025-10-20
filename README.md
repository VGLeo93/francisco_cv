# Francisco Vaquero — Interactive CV (HTML/CSS/JS)

This repository contains a single‑page, interactive resume implemented with vanilla HTML/CSS/JS. It is optimized for desktop and mobile, prints cleanly to A4/PDF, supports dark/light themes, and includes tasteful micro‑interactions.

## Quick Start

- Open `index.html` in any modern browser (no build tooling required).
- Toggle dark/light with the switch in the top‑right of the name card.
- Desktop gestures:
  - Experience slider: horizontal trackpad scroll or Shift+mouse‑wheel left/right to move between cards; Left/Right keys also work.
  - SKILLS block: horizontal trackpad scroll or Shift+mouse‑wheel to swap between the text list and the animated bars; Left/Right keys also work when focused.
- Mobile gestures:
  - Experience slider: swipe left/right to move between roles.
  - SKILLS block: swipe left/right to swap views.

## Project Structure

```
index.html      # Content and structure
styles.css      # Visual design, layout, animations, dark theme tokens
animations.js   # Behavior: reveal-on-scroll, theme cascade, sliders, gestures
Francisco_Vaquero_CV_Tech.md  # Source content/notes used to populate the CV
Francisco_Vaquero_CV_Cleaned_Typos.pptx  # Reference layout/assets (not used at runtime)
```

### Main Sections

- Left sidebar (static + interactive)
  - Identity header with theme toggle (dark/light)
  - Contact, Summary
  - SKILLS (stacked swapper)
    - Slide 1: text list (Web / Automation & Platforms / IT Support & Operations / Data & Reporting / Core Strengths)
    - Slide 2: animated skill bars (Recent Focus + Core Stack)
  - Languages
- Right content
  - Experience (stacked slider with one card visible at a time)
  - Education

## Features

### Layout & Print
- Two‑column layout optimized for desktop; responsive collapse on small screens.
- Print to A4 with preserved two columns and disabled animations.

### Theme & Color
- Theme toggle (dark/light) with a subtle cascade overlay animation.
- Design tokens:
  - Light: `--accent` blue → violet, soft pane background.
  - Dark: `--accent` violet → sky; sidebar uses dark ink on white for contrast.

### Animations
- Reveal‑on‑scroll for sections and titles.
- Name card sheen once on load; section title underlines animate in.
- Experience cards: hover lift; slide in/out between cards.
- Skill bars: only the hovered/tapped/focused bar animates and saturates; others remain calm.
- Theme switch: layered radial + linear gradient cascade with eased timing.

### Interaction & Gestures
- Horizontal intent detection for trackpads and wheels:
  - If `|deltaX| > |deltaY|` (or Shift held → use `deltaY`), treat as horizontal navigation.
- Experience slider (right column): stacked slides; one card visible; moves left/right via:
  - Trackpad horizontal scroll or Shift+wheel, swipe on touch, or Left/Right keys.
- SKILLS swapper (left column): stacked slides; stays in place; switches list ↔ bars via:
  - Trackpad horizontal scroll or Shift+wheel, swipe on touch, or Left/Right keys.
- Print mode: opens and expands details automatically; animations disabled.

### Accessibility
- Bars use `role="meter"` with `aria-valuemin/max/now`.
- Keyboard navigation for both sliders (Left/Right) and Escape/Enter where applicable.
- High‑contrast text in dark mode, including sidebar.

## Customization Guide

- Content
  - Edit text lists and the bars inside the SKILLS swapper in `index.html`.
  - Edit experience cards (company, dates, bullets) in `index.html` using the reference content in `Francisco_Vaquero_CV_Tech.md`.
- Skill bars
  - Each bar has a `--p:` inline percentage (e.g., `--p:88%`).
  - Add/remove bars by duplicating a `<li class="skill">` in the Recent/Core groups.
- Colors & Theme
  - Update `:root` and `[data-theme='dark']` tokens in `styles.css`.
  - Cascade speed/feel: adjust `@keyframes cascadeReveal` and `.theme-cascade.run` timing.
- Animations
  - Slide timing: `.skills-swapper .skills-slide` and experience slide transitions.
  - Reveal thresholds: tune the IntersectionObserver options in `animations.js`.

## Known Considerations / TODOs

- `color-mix()` is used for subtle tints; older browsers fall back to basic colors.
- If adding a third SKILLS view (e.g., Frameworks), extend the swapper to 3 slides and update the Left/Right handlers accordingly.
- Add visible affordance (chevron/dots) on SKILLS to hint it’s swipeable (optional).
- Experience and SKILLS sliders currently share similar logic; extract a small slider utility if you plan to add more stacked views.
- PPT assets are not required at runtime; they’re just for reference.

## Implementation Notes (for the next AI agent)

- Sliders are “stacked” (absolute positioned slides inside a container whose height is set to the active slide’s `scrollHeight`).
  - Experience slider container: `#exp-cards` (right column).
  - SKILLS swapper: `#skills-swapper` (left column).
- Horizontal intent logic is centralized per slider/swapper:
  - Desktop: intercept only when horizontal intent is clear, or Shift is held.
  - Touch: pointer/touchstart/…end with threshold (30–40px) decides left/right.
- Theme cascade origin is derived from the theme‑toggle button’s bounding rect; animation then switches theme ~120ms after start to hide flicker.
- Print hooks (`beforeprint/afterprint`) expand `<details>` and restore their state.

## File Map

- `index.html`
  - Sidebar: identity, contact, summary, skills (stacked), languages
  - Content: experience (stacked), education
- `styles.css`
  - Tokens, layout, reveal animations, card/transitions, skill bars, dark theme, print
- `animations.js`
  - Reveal observer, theme toggle + cascade, experience slider, skills swapper, per‑bar activation logic

## License / Notes
This CV is personal content intended for job applications. Do not publish or remix without consent.
