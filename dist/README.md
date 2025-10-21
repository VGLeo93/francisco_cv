# Francisco Vaquero — Interactive CV (HTML/CSS/JS)

This repository contains a single‑page, interactive resume implemented with vanilla HTML/CSS/JS. It is optimized for desktop and mobile, prints cleanly to A4/PDF, supports dark/light themes, and includes tasteful micro‑interactions.

## Quick Start

- Open `index.html` in any modern browser (no build step).
- Toggle dark/light with the switch inside the name card.
- Desktop (≥980px):
  - Experience carousel: horizontal trackpad scroll, Shift+mouse‑wheel, ◀/▶ buttons, or Left/Right keys.
  - SKILLS swapper: horizontal scroll/swipe or Left/Right keys.
- Mobile (<980px):
  - Experience shows as a vertical timeline (scroll to read long entries).
  - SKILLS appears after Experience for better reading flow.

## Project Structure

```
index.html      # Content and structure
styles.css      # Visual design, layout, tokens, responsive rules
animations.js   # Reveal-on-scroll, theme toggle, skills swapper, experience slider (vanilla)
Francisco_Vaquero_CV_Tech.md  # Source content/notes used to populate the CV
Francisco_Vaquero_CV_Cleaned_Typos.pptx  # Reference layout/assets (not used at runtime)
```

### Main Sections

- Sidebar (left on desktop; first on mobile)
  - Identity (theme toggle), Contact, Summary
  - SKILLS (swapper: list ↔ bars)
  - Languages
- Content (right on desktop)
  - Experience
    - Desktop: stacked carousel (one card visible at a time)
    - Mobile: vertical timeline (scrollable)
  - Education

## Features

### Layout & Print
- Desktop: two‑column layout
- Mobile: single column with reading order — Identity → Contact → Summary → Experience → Skills → Languages
- Print (A4): preserved two columns; animations disabled; details expanded

### Theme & Color
- Theme toggle (dark/light), respects reduced‑motion
- Design tokens in `:root` and `[data-theme='dark']`

### Animations
- Reveal‑on‑scroll (fade/translate only; no blur to keep text crisp on mobile)
- Name card sheen once; section title underline animates in
- Experience cards: hover lift; slide transitions on desktop
- Skill bars: only hovered/focused/tapped bar animates

### Interaction & Gestures
- Horizontal intent detection: only consume trackpad/wheel when clearly horizontal (or Shift+wheel)
- Experience (desktop): trackpad/wheel/◀▶/dots/Left‑Right keys, with wrap‑around (no dead‑ends)
- Experience (mobile): vertical timeline — normal scroll
- SKILLS swapper: horizontal scroll/swipe or Left/Right keys
- Print mode: details auto‑expand; animations disabled

### Accessibility
- `.sr-only` utility for screen‑reader text
- Skill bars: `role="meter"` with `aria-valuemin/max/now`
- Keyboard navigation (Left/Right) for carousel/swapper; focus styles
- `#experience` anchor sentinel for reliable in‑page jumps across layouts
- Honors `prefers-reduced-motion`

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

- `color-mix()` has fallbacks; exact tinting can vary on older browsers
- If adding a third SKILLS view, extend the swapper and handlers accordingly
- Carousel defaults to the built‑in slider (no CDN); Swiper is optional
- PPT assets are not required at runtime

## Experience: Desktop vs Mobile

- Desktop (≥980px): `#experience-carousel` shows a single card at a time and wraps from last → first.
- Mobile (<980px): `section.experience` is a vertical timeline so long entries are fully readable.
- Anchors: `#experience` is a sentinel placed above the experience zone so in‑page links land correctly.

## Enabling Swiper (optional)

The project includes Swiper CSS/JS via CDN in `index.html`, but uses the built‑in slider by default for maximum reliability.

- To enable Swiper: set `const USE_SWIPER = true;` in `animations.js` (Swiper block) and keep the CDN tags in `index.html`.
- To self‑host Swiper: replace CDN tags with local assets and leave `USE_SWIPER = true`.

## Deploy (GitHub Pages)

This repo includes an automated workflow to publish the static site with GitHub Pages:

- Push to `main` (or trigger the workflow manually in the Actions tab).
- Workflow `.github/workflows/deploy.yml` builds a minimal `public/` folder and deploys using `actions/deploy-pages`.
- The site will be available at the repository’s Pages URL (Settings → Pages). The workflow sets the `github-pages` environment automatically.

Local preview: simply open `index.html` in a browser; no build step is required.

## Testing

Basic UI checks run with Puppeteer Core + system Chrome.

- Requirements: Chrome/Chromium available on the system (e.g., `/usr/bin/google-chrome`), Node 18+
- Install dev deps: `npm ci`
- Run: `npm run test:ui`
- Verifies: theme toggle loads; SKILLS swapper gesture; Experience carousel (desktop) advances and loops

## Implementation Notes (for maintainers)

- Sliders are “stacked” (absolute positioned slides inside a container whose height is set to the active slide’s `scrollHeight`).
  - Experience slider container: `#exp-cards` (right column).
  - SKILLS swapper: `#skills-swapper` (left column).
- Horizontal intent logic is centralized per slider/swapper:
  - Desktop: intercept only when horizontal intent is clear, or Shift is held.
  - Touch: pointer/touchstart/…end with threshold (30–40px) decides left/right.
- Theme cascade origin is derived from the theme‑toggle button’s rect. Respects reduced‑motion.
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
