# Francisco Vaquero — CV

[View the CV website](https://vgleo93.github.io/francisco_cv/) · [Download the PDF](Francisco_Vaquero_CV.pdf) · [Read the Markdown CV](Francisco_Vaquero_CV_Tech.md)

A developer portfolio and downloadable résumé, built with semantic HTML, responsive CSS and small vanilla JavaScript enhancements. Dark ink, coral accents, name-led typography and a small request-handling app give the website its own identity. Seven roles form a readable career timeline before the open skills groups; training and contact close the page.

The site has no framework or third-party runtime requests. Fonts, tool icons, the original portrait and all 16 certificates are served locally.

## Content

The headline is **Software Developer & Automation Specialist**, reflecting hands-on application development and automation work. Development tools are listed separately from experience and course certificates.

The interactive example, **From request to next step**, uses a plain-language form. Visitors choose app support, a new customer or a billing question, then edit the sample name, request and urgency. `Prepare request` creates a readable card showing the responsible team, next action and a template reply. Changing urgency changes the action; changing any input clears the previous result. Invalid fields receive a clear error and keyboard focus. An explanation connects the example to collecting information and automating handoffs, with optional rule details and a source link.

This is a working browser-only example with deterministic rules and templates. It does not claim a client project, a real backend, an AI response, an actual message or a saved customer record. No form values leave the page or enter storage. On phones, a native disclosure keeps the demo optional so readers reach experience sooner.

The existing website is the source for contact details and earlier employment dates; the original Markdown draft used a different phone number and overlapping early-role dates. These published details are preserved. The existing AI Engineer document is identified as a Codecademy Certificate of Completion dated October 20, 2025. The original portrait and all 16 certificate PDFs are retained; the page serves a smaller 240×309 WebP copy of the portrait.

The owner subsequently confirmed the FundFlare employment dates as December 14, 2023–April 26, 2025. The website, Markdown CV and downloadable PDF use this corrected range.

The September 30 update adds the owner-confirmed current role at **Praeco**, starting **January 27, 2026**, under the descriptive title **Automation Developer**. It includes full-stack development, Salesforce and n8n automations, Supabase and SQL, VPS and Tailscale administration, web scraping, trading bot development, machine learning, local AI fine-tuning, AI coding tools and cybersecurity support. Cybersecurity wording remains general because the owner has not specified individual security tasks. The personally owned NVIDIA DGX Spark appears under a separate personal AI lab note. No performance metrics, seniority, security certifications or trading results are inferred.

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
- One-shot section reveals and signals during request preparation are optional. There is no idle animation or pointer tilt. `Pause motion` saves a preference; the operating system's reduced-motion setting takes priority. Background tabs and printing cancel active motion, unlock all form fields and clear the incomplete result. A cancelled example returns to a ready state rather than restarting unexpectedly.
- The workflow produces the same result without timed movement when motion is paused or reduced. All résumé content stays visible without JavaScript; native disclosures still work. PDF page one includes readable email, phone and public profile URLs.

## Verification

`npm run test:ui` checks identity, seven roles, the current Praeco role and start date, the precise FundFlare dates, 16 certificates, fonts and local downloads, anchors, active navigation/progress, disclosure, theme/system/storage behavior, text contrast, finite reveals, all three example routes and both urgency levels, field validation and trimming, safe literal text, stale-result clearing, template output, error descriptions/focus, workflow stages, reentry prevention, keyboard activation/focus, motion persistence, live reduced-motion changes, simulated background visibility, print restoration, no-JavaScript reading, console health and overflow at 320, 360, 390, 768, 1024 and 1469 pixels. It also checks the 1168×556 laptop opening and mobile first paint with the deferred script withheld.

Tests and PDF export share a loopback-only HTTP server that serves public CV files, not development tools or directory listings. This gives fonts the same same-origin behavior as GitHub Pages.

[Design references, refinement decisions, delegation and QA scope](DESIGN_NOTES.md) document the redesign. The requested Claude Opus 5.5 high-effort critic reviewed source and local captures; its material finishing requests were implemented. The main agent checked real Chrome interactions and independently ran the expanded regression suite. Both PDF pages were rendered and visually inspected, including first-page contact links and the separate additional-course group.

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
- `animations.js`: theme, finite reveals, sample-request validation/routing, reply templates, workflow state, motion controls, responsive demo disclosure, navigation/progress and print restoration.
- `Francisco_Vaquero_CV_Tech.md`: editable, application-friendly text CV.
- `Francisco_Vaquero_CV.pdf`: printable download.
- `scripts/`: shared browser launcher, restricted local HTTP preview, PDF export and site packaging.
- `assets/`: self-hosted fonts, optimized portrait, original SVG tool references and their licenses.
- `certifications/`: original certification documents.

## Asset attribution

[Inter](https://github.com/google/fonts/tree/main/ofl/inter) and [Space Grotesk](https://github.com/google/fonts/tree/main/ofl/spacegrotesk) are self-hosted WOFF2 fonts under the SIL Open Font License; both license files are in `assets/fonts/`. Python and Slack brand SVGs come from [Font Awesome Free](https://github.com/FortAwesome/Font-Awesome/tree/7.x/svgs/brands); its icon license is in `assets/icons/`. Brand marks retain their owners' trademark rights. Concept images are design references, not production assets.

This CV is personal content intended for job applications. Reuse requires the owner's consent.
