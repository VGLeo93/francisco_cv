# Francisco Vaquero — CV

[View the CV website](https://vgleo93.github.io/francisco_cv/) · [Download the PDF](Francisco_Vaquero_CV.pdf) · [Read the Markdown CV](Francisco_Vaquero_CV_Tech.md)

A developer portfolio and downloadable résumé, built with semantic HTML, responsive CSS and small vanilla JavaScript enhancements. Dark ink, coral accents, oversized typography and an interactive workflow playground give the website its own identity. Skills use open capability groups; six roles form a readable career timeline; training and contact close the page.

The site has no framework or third-party runtime requests. Fonts, tool icons, the original portrait and all 16 certificates are served locally.

## Content

The September 2026 redesign presents Francisco as a developer working with automation and integrations. The workflow playground is an illustrative, local-state demo—not a claimed client project. It sends a visible signal through Webhook → Python → Slack when a visitor presses `Run workflow`; it does not contact an API or send messages.

The existing website is the source for contact details and employment dates; the original Markdown draft used a different phone number and overlapping early-role dates. The revamp preserves the published website's details. No new employers, credentials, dates, proficiency scores or numerical achievements were added. The existing AI Engineer certificate records completion in October 2025. The original portrait and all 16 certificate PDFs are retained.

The owner subsequently confirmed the FundFlare employment dates as December 14, 2023–April 26, 2025. The website, Markdown CV and downloadable PDF use this corrected range.

Edit both `index.html` and `Francisco_Vaquero_CV_Tech.md` when changing professional facts. The PDF is generated from the website's print stylesheet, with certificate links rewritten to the public website so they also work outside this checkout.

## Local use

Serve the repository with `python3 -m http.server 4173 --bind 127.0.0.1`, then open `http://127.0.0.1:4173/`. Use HTTP rather than opening `index.html` directly: some browsers block local-file fonts.

With Node 22 and Chrome/Chromium installed (`.node-version` selects the supported version):

```sh
npm ci
npm run build:pdf
npm run test:ui
npm run build
```

If Chrome is in a nonstandard location, set `CHROME` to its executable. Dependencies are only used for PDF export and tests; the website itself has no third-party runtime requests or build framework.

- `Save as PDF` downloads `Francisco_Vaquero_CV.pdf`.
- Browser printing uses a compact white A4 stylesheet and expands all certificate links. The generated download is two pages with selectable, tagged text and public certificate links.
- The theme follows the system until a reader saves a choice; storage-restricted browsing is supported.
- One-shot section reveals, moving workflow signals and subtle fine-pointer tilt are optional. `Pause motion` saves a preference; the operating system's reduced-motion setting takes priority. Background tabs and printing cancel active motion. A cancelled workflow returns to a ready state rather than restarting unexpectedly.
- The workflow remains usable without timed movement when motion is paused or reduced. All résumé content stays visible without JavaScript; native certificate disclosure still works.

## Verification

`npm run test:ui` checks identity, six roles, the precise FundFlare dates, 16 certificates, fonts and local downloads, anchors, active navigation/progress, disclosure, theme/system/storage behavior, text contrast, finite reveals, workflow stages, reentry prevention, keyboard activation/focus, motion persistence, live reduced-motion changes, simulated background visibility, print restoration, no-JavaScript reading, console health and overflow at 320, 360, 390, 768, 1024 and 1469 pixels.

Tests and PDF export share a loopback-only HTTP server that serves public CV files, not development tools or directory listings. This gives fonts the same same-origin behavior as GitHub Pages.

[Design references, fidelity checks, delegation and QA scope](DESIGN_NOTES.md) document the redesign. The main agent checked real Chrome interactions and independently reran the sub-agent's regression suite. Both PDF pages were rendered and visually inspected.

To capture local QA images outside the repository:

```sh
mkdir -p /tmp/francisco-cv-qa
CV_QA_DIR=/tmp/francisco-cv-qa npm run test:ui
npm run shot:skills
```

## Deployment

Only `.github/workflows/pages.yml` publishes to GitHub Pages on pushes to `main`. It exports the PDF, runs UI checks and stages an explicit asset list in `public/`: site code, self-hosted assets/licenses, original portrait, CV downloads and certificates. `.github/workflows/deploy.yml` validates pull requests rather than competing with the Pages publisher.

The generated site excludes development tools and local evidence. Original PowerPoint/reference files remain in the repository. The website and PDF contain the same current experience; certificate disclosure opens automatically for printing.

## Files

- `index.html`: professional content and accessible page structure.
- `styles.css`: design tokens, responsive layouts and A4 print rules.
- `animations.js`: theme, finite reveals, workflow state, motion controls, pointer tilt, navigation/progress and print restoration.
- `Francisco_Vaquero_CV_Tech.md`: editable, application-friendly text CV.
- `Francisco_Vaquero_CV.pdf`: printable download.
- `scripts/`: shared browser launcher, restricted local HTTP preview, PDF export and site packaging.
- `assets/`: self-hosted fonts, SVG tool icons and their licenses.
- `certifications/`: original certification documents.

## Asset attribution

[Inter](https://github.com/google/fonts/tree/main/ofl/inter) and [Space Grotesk](https://github.com/google/fonts/tree/main/ofl/spacegrotesk) are self-hosted WOFF2 fonts under the SIL Open Font License; both license files are in `assets/fonts/`. Python and Slack brand SVGs come from [Font Awesome Free](https://github.com/FortAwesome/Font-Awesome/tree/7.x/svgs/brands); its icon license is in `assets/icons/`. Brand marks retain their owners' trademark rights. Concept images are design references, not production assets.

This CV is personal content intended for job applications. Reuse requires the owner's consent.
