You asked for a more eye‑catching effect that feels like a wave sweeping across the page when switching themes.  Most basic approaches (such as fading or sliding a pseudo‑element) work but aren’t very playful.  Recently, developers have started using the View Transition API with custom `clip‑path` masks or SVGs to achieve creative effects.  One particularly neat solution was presented by Stuart Langridge in June 2025 – it uses a sine‑wave `clip‑path` to “wipe” the page from top to bottom and left to right.  Here’s how it works and how you can adapt it for your site.

### How the wave effect works

1. **Progressively animate a custom property** – you define a CSS custom property (e.g. `--time`) and register it so it can be animated.  The `@property` rule declares the syntax and initial value.
2. **Define a keyframe that updates `--time`** – the `move-in` animation changes `--time` from −0.1 to 1.1 so the wave starts slightly above the viewport and ends below it.  This drives the wave’s vertical position and horizontal offset.
3. **Build a wave using a polygon `clip-path`** – inside `::view-transition-new(root)`, you construct a `polygon()` with points every 10 % across the width.  Each y‑coordinate is calculated by `cos((<position> + var(--time)) * var(--lr)) * 10% + (100% * var(--time))`.  Here `var(--lr)` is the number of radians across the width (derived from the number of humps).  The result is a sine wave that sweeps down the page while sliding leftwards.
4. **Use the View Transition API** – wrap your theme switch in `document.startViewTransition()` (or navigate to the same page with a form, as Langridge does).  Set `::view-transition-old(root)` to a dummy animation to avoid a default fade, and give `::view-transition-group(root)` the same duration as your wave so the transition stays in sync.

This technique is pure CSS except for toggling the theme class.  The wave height, number of humps and speed can be customised via CSS variables (`--humps`, animation duration).  It currently works in Chromium and Safari browsers that support `@view-transition`; fallback can simply toggle the class without animation.

### Sample implementation

```html
<!-- Toggle button -->
<button id="toggle-theme">Toggle theme</button>

<script>
const html = document.documentElement;
const toggle = document.getElementById('toggle-theme');
toggle.addEventListener('click', () => {
  // When the transition API is supported, wrap updates in startViewTransition.
  const next = html.classList.contains('dark') ? 'light' : 'dark';
  if (document.startViewTransition) {
    document.startViewTransition(() => {
      html.classList.toggle('dark', next === 'dark');
    });
  } else {
    html.classList.toggle('dark');
  }
});
</script>

<style>
/* register our animatable custom property */
@property --time { syntax: "<number>"; initial-value: 0; inherits: false; }

/* duration of the view transition */
@view-transition { navigation: auto; }
::view-transition-group(root) { animation-duration: 1.5s; }

/* dummy animation on the outgoing page (avoids default fade) */
@keyframes move-out { }
::view-transition-old(root) {
  animation: move-out 1.5s ease-in both;
}

/* animate --time from -0.1 to 1.1 */
@keyframes move-in { from { --time: -0.1; } to { --time: 1.1; } }

/* wave clip-path on the incoming page */
::view-transition-new(root) {
  --humps: 1.5;           /* number of waves across width */
  --pi: 3.14159;          /* half tau */
  --lr: calc(var(--humps) * var(--pi));
  /* clip-path: approximate sine wave with points at 0%, 10%, … */
  clip-path: polygon(
    0% 0%,
    0% calc(cos(calc(0 + var(--time)) * var(--lr)) * 10% + (100% * var(--time))),
    10% calc(cos(calc(0.1 + var(--time)) * var(--lr)) * 10% + (100% * var(--time))),
    20% calc(cos(calc(0.2 + var(--time)) * var(--lr)) * 10% + (100% * var(--time))),
    30% calc(cos(calc(0.3 + var(--time)) * var(--lr)) * 10% + (100% * var(--time))),
    40% calc(cos(calc(0.4 + var(--time)) * var(--lr)) * 10% + (100% * var(--time))),
    50% calc(cos(calc(0.5 + var(--time)) * var(--lr)) * 10% + (100% * var(--time))),
    60% calc(cos(calc(0.6 + var(--time)) * var(--lr)) * 10% + (100% * var(--time))),
    70% calc(cos(calc(0.7 + var(--time)) * var(--lr)) * 10% + (100% * var(--time))),
    80% calc(cos(calc(0.8 + var(--time)) * var(--lr)) * 10% + (100% * var(--time))),
    90% calc(cos(calc(0.9 + var(--time)) * var(--lr)) * 10% + (100% * var(--time))),
    100% calc(cos(calc(1.0 + var(--time)) * var(--lr)) * 10% + (100% * var(--time))),
    100% 0%
  );
  animation: move-in 1.5s ease-in both;
}

/* Light and dark theme variables */
html {
  --bg: #f1f2e3;
  --text: #522;
}
html.dark {
  --bg: #522;
  --text: #f1f2e3;
}

/* Use variables with transitions so colours fade smoothly */
body {
  background: var(--bg);
  color: var(--text);
  transition: background 0.3s, color 0.3s;
}
</style>
```

This implementation follows the logic described by Langridge: a sine‑wave `clip‑path` runs from top to bottom while sliding horizontally, giving the appearance of a wave washing over the page.  Because the theme colours themselves are stored in CSS custom properties and the body transitions these colours, the wave reveals the new theme behind it.  You can adjust `--humps` to change the number of waves (e.g. 0.5 for a single hump, 2 for more), tweak the `animation-duration` for speed, or add more points to the `polygon()` for smoother curves.  For browsers without `@view-transition` support, the code gracefully falls back to an instant toggle.

This wave effect is highly eye‑catching and relies only on modern CSS and a small amount of JavaScript; no external libraries are required.  It offers a distinctive alternative to simple fades or slides when changing between light and dark themes.
