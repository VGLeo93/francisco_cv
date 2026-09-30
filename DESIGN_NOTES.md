# Animated developer CV — design and QA

September 29, 2026. The redesign implements an ink/coral/mint developer portfolio, with a clean printable résumé as a separate presentation. No new employment, projects, achievements or credentials were invented.

## Accepted references

Four full-section Image Gen concepts guided the implementation before coding. Preview files remain in the owner's local generated-images directory; they are not bundled into the website:

`/home/fvaquero/.codex/generated_images/01a0ef13-085b-70f2-ae39-98094487d94b/`

| Section | Accepted concept | Native viewport checked |
| --- | --- | --- |
| Hero/workflow | `exec-a31284cd-f70a-4ff6-b27f-72b75179b0a4.png` | 1487 × 1058 |
| Skills | `exec-c5a50f13-b6b0-4cc0-aab9-cde9ad5b1eb3.png` | 1505 × 1045 |
| Experience | `exec-29000019-7b18-43c6-9375-5cec75b1cbb0.png` | 1505 × 1045 |
| Training/contact | `exec-3737c8d3-d385-4494-8361-6c9c016f6660.png` | 1505 × 1045 |

The initial skills/experience concepts contained invented continuation content. They were rejected and regenerated with the existing factual copy. The frontend design skill influenced the stronger hierarchy, open sections, palette and reference-to-render comparison. Image generation supplied visual direction; all interactive UI is native HTML/SVG/CSS.

## Fidelity ledger

The main agent opened each accepted concept and the latest corresponding browser capture with `view_image` in the same QA pass. Native-size screenshots came from a local HTTP site using the repository's Puppeteer browser launcher. Reduced motion kept static comparisons deterministic; normal-motion interaction tests were separate.

| Comparison point | Concept evidence | Initial render mismatch | Repair or intentional treatment |
| --- | --- | --- | --- |
| Hero composition | Large two-line name beside one wide workflow frame | Name and frame were undersized | Name raised to 150px desktop; column proportions, line-height and spacing tuned; frame now approximately 706 × 648px |
| Typography hierarchy | Oversized headings, readable mint role, strong lead, quiet utility text | Role/body/section scales were too small | Role 30px, lead 32px, summary 21px; section and skill scales raised; utilities remain secondary |
| Primary action | Broad coral contact button | Small document-like button | Contact action resized to 276 × 71px; local arrow and clear focus treatment retained |
| Workflow graphic | Three large tool nodes across curved mint connections | Nodes were small and tightly centered | Nodes 112px with blue outlines; endpoints spread; native SVG path and CSS signals share the same coordinates |
| Skills | Five open groups, two columns, coral strokes and mint labels | Small text and excess vertical density | 32px labels, 24px lists, aligned coral strokes and compact section continuation; single-column phone layout |
| Experience | Narrow date rail, coral nodes, open role/bullet column | Rail and bullets were too small | Rail widened, 21px dates/bullets and larger role/employer text; all six original entries retained |
| Palette/container model | Dark ink, coral, mint, fine rules, one demo frame | Earlier résumé layout lacked the portfolio hierarchy | Shared ink surface and tokens; no generic project-card grid, fake terminal or metrics |
| Training/contact | Featured credential, open certificate lists, large closing line, portrait/details | Earlier captures omitted the lazy portrait | Portrait scrolled into view and confirmed loaded before capture; contact and training spacing tuned |
| Copy | Explicit developer introduction and honest demo caption | No factual additions allowed | Ordered hero-copy audit passed; employment headings, employers, dates and bullets matched commit `eb7839b324865951e5c7175257896ea02bc7c66a` exactly after whitespace normalization |
| Motion/responsiveness | A usable animated developer showcase | Static concept cannot specify interaction states | Real finite demo, ambient signals, finite reveals, pause/system opt-out, keyboard use and 320–1469px layouts verified |

The implementation was faithfully verified against the accepted design direction. No unresolved material design mismatches remain within the intentional variants below. This is a visual judgment, not a claim of pixel-identical generated typography.

### Intentional variants

- Self-hosted Space Grotesk and Inter provide reproducible browser typography rather than unidentified generated letterforms. Surfaces are solid ink rather than the concept's raster texture.
- Licensed Python/Slack SVGs use the mint palette rather than the concept's multicolored logo rendering. The original outline icon family and a document icon for the PDF action are retained.
- The original grayscale portrait replaces the concept's neutral placeholder. Real education details wrap naturally rather than using the concept's condensed mockup lines.
- The light theme follows the same layout on true white, with darker coral/mint text for contrast.
- `Pause motion`, `Resume motion` and `Reduced motion` are functional states; workflow status changes only to describe real local state. These are the only intentional hero-copy state variants. No eyebrow, badge, invented project or achievement was added.
- Phones stack the hero/workflow and open lists rather than shrinking desktop columns. The PDF is a white, two-page A4 résumé with no interactive visual demo.

## Independent verification

The requested sub-agent implemented the animation controller and extended `tests/ui.spec.js`. The main agent reviewed the code, applied layout integration and accessibility refinements, and independently reran the suite.

One bounded authenticated MSI local-model request returned five accessibility/test suggestions. The main agent independently checked the relevant cases: live OS opt-out, cancelled-demo status, print cleanup, one-shot reveal behavior and touch/keyboard focus. It fixed the stale cancelled status and added a real Tab-based focus-ring assertion. No model output was executed automatically. A suggestion to mark the demo busy on resuming ambient motion was not adopted: a cancelled demo intentionally stays idle until run again.

Actual Chrome checks through the browser control surface verified:

- `Run workflow` reached `Workflow complete`.
- Pause/resume changed the root motion mode and pressed state.
- At 390 × 844, navigation, light-theme switching and native certificate expansion worked; all 16 certificate paths remained present, with no horizontal overflow.
- Browser console inspection found no error/warning entries at the time checked.

Repeatable Chromium tests cover six responsive widths, fonts, local assets, exact FundFlare ISO dates, certificates, keyboard/reentry, system/storage preferences, live reduced-motion changes, contrast, print restoration, no-JavaScript reading and runtime/network health. A separate loopback-server diagnostic verified allowed assets and HEAD requests, denied development files/directory listings, path bounds and method restrictions.

The downloadable PDF was regenerated, all two pages rendered with Poppler and visually inspected. `pdfinfo` reported tagged A4 text; text extraction preserved the full name, six roles, corrected dates and certificate titles. Certificate links use public HTTPS destinations rather than checkout paths.

### Scope and remaining risk

Verification used local source and Chromium, not a Safari/Firefox matrix or a physical phone. Hidden-tab cancellation is a deterministic visibility simulation, not a physical operating-system tab-switch measurement. It is not a formal accessibility certification or screen-reader audit. No post-deployment live-site browser verification is claimed; GitHub Actions determines publication status separately.

Temporary browser/PDF QA images are not deployment assets. The accepted concept previews stay in the normal local generated-images location. See the README for reproducible UI checks and PDF/site build commands.
