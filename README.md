# Francisco Vaquero — CV

[View the CV website](https://vgleo93.github.io/francisco_cv/) · [Download the PDF](Francisco_Vaquero_CV.pdf) · [Read the Markdown CV](Francisco_Vaquero_CV_Tech.md)

A personal CV for automation, integrations and IT operations roles. Built with semantic HTML, CSS and a small vanilla JavaScript theme controller. The website has an editorial two-column desktop layout, a mobile reading layout, light/dark themes and downloadable certificates. Experience is visible without carousels; skills are grouped by capability.

## Content

The September 2026 revamp brings Fundflare / Graceful FundFlare to the front, tightens the experience bullets, integrates the current automation stack into the skills and summary, and moves training below experience. It adds a downloadable, selectable-text CV PDF.

The existing website is the source for contact details and employment dates; the original Markdown draft used a different phone number and overlapping early-role dates. The revamp preserves the published website's details. No new employers, credentials, dates, proficiency scores or numerical achievements were added. The existing AI Engineer certificate records completion in October 2025. The original portrait and all 16 certificate PDFs are retained.

Edit both `index.html` and `Francisco_Vaquero_CV_Tech.md` when changing professional facts. The PDF is generated from the website's print stylesheet, with certificate links rewritten to the public website so they also work outside this checkout.

## Local use

Open `index.html` directly, or serve the repository with `python3 -m http.server 4173 --bind 127.0.0.1`.

With Node 22 and Chrome/Chromium installed (`.node-version` selects the supported version):

```sh
npm ci
npm run build:pdf
npm run test:ui
npm run build
```

If Chrome is in a nonstandard location, set `CHROME` to its executable. Dependencies are only used for PDF export and tests; the website itself has no third-party runtime requests or build framework.

- `Save as PDF` downloads `Francisco_Vaquero_CV.pdf`.
- Browser printing uses the A4 stylesheet and expands all certificate links.
- The theme follows the system until a reader saves a choice; storage-restricted browsing is supported.
- All experience remains readable with JavaScript disabled.

## Verification

`npm run test:ui` checks page identity, six employment entries, all 16 certificate links, local assets/PDF, valid anchors, navigation, certificate disclosure, theme persistence and system preferences, unavailable storage, text contrast, print-state restoration, no-JavaScript reading, runtime errors and horizontal overflow at 320, 360, 390, 768, 1024 and 1469 pixels.

To capture local QA images outside the repository:

```sh
CV_QA_DIR=/tmp/francisco-cv-qa npm run test:ui
npm run shot:skills
```

## Deployment

Only `.github/workflows/pages.yml` publishes to GitHub Pages on pushes to `main`. It exports the PDF, runs UI checks and stages an explicit asset list in `public/`: site code, original portrait, CV downloads and certificate PDFs. `.github/workflows/deploy.yml` now validates pull requests rather than competing with the Pages publisher.

The generated site excludes development tools and local evidence. Original PowerPoint/reference files remain in the repository. The website and PDF contain the same current experience; certificate disclosure opens automatically for printing.

## Files

- `index.html`: professional content and accessible page structure.
- `styles.css`: design tokens, responsive layouts and A4 print rules.
- `animations.js`: theme preferences and print disclosure state.
- `Francisco_Vaquero_CV_Tech.md`: editable, application-friendly text CV.
- `Francisco_Vaquero_CV.pdf`: printable download.
- `scripts/`: shared browser launcher, PDF export and site packaging.
- `certifications/`: original certification documents.

This CV is personal content intended for job applications. Reuse requires the owner's consent.
