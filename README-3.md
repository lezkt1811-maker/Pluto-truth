# True Sky vs. Tropical Grid

A lightweight, open-source single page that shows — planet by planet, live — the gap between mainstream **tropical astrology** (a fixed 30°-per-sign grid) and **true-sky astronomy** (the real, unevenly-sized IAU constellations). Built to match the look and feel of [StarChart 13](https://starchart13.com) and drive traffic back there.

No build step, no backend, no dependencies to install. It's three files plus your own screenshots.

## What it does

- **Live discrepancy matrix** — calculates the current geocentric position of the Sun, Moon, and every planet through Mercury–Pluto, directly in the visitor's browser, using [Astronomy Engine](https://github.com/cosinekitty/astronomy) (MIT-licensed, loaded from a CDN). For each body it shows:
  - the **tropical sign** the mainstream grid assigns it (30°-of-ecliptic slices from the true equinox of date)
  - the **actual IAU constellation** it's sitting in right now, from real right ascension/declination
  - a clear match/mismatch verdict
- **Proof gallery** — four card slots pre-loaded with example screenshots (an ephemeris table, a true-sky natal wheel, a Stellarium sky-map capture, and a close-up) so the page is deploy-ready tonight. Swap in your own any time.
- **CTA links** back to starchart13.com throughout, using explicit anchor text ("Verify your actual chart placements against the real sky at StarChart 13") so visitors know exactly where to go.
- **Social post generator** — a tab module that auto-writes a copy-paste-ready post for TikTok, Instagram, and Facebook, built around whichever planet has the biggest live discrepancy right now (Pluto is prioritized when it qualifies).

## File structure

```
├── index.html          # page markup
├── style.css            # design system + layout
├── app.js                # ephemeris calculation, matrix rendering, post generator
├── assets/proof/         # your screenshot proofs (4 included as placeholders)
│   ├── ephemeris-table.jpg
│   ├── natal-wheel.jpg
│   ├── sky-map.jpg
│   └── wheel-detail.jpg
└── README.md
```

## Deploy on GitHub Pages tonight

1. Create a new **public** repo on GitHub (e.g. `true-sky-vs-tropical`).
2. Upload all files in this folder, keeping the `assets/proof/` structure.
3. In the repo, go to **Settings → Pages**.
4. Under "Build and deployment", set **Source** to `Deploy from a branch`, branch `main`, folder `/ (root)`. Save.
5. GitHub gives you a URL like `https://yourusername.github.io/true-sky-vs-tropical/` within a minute or two.

No `npm install`, no build tooling — it's static HTML/CSS/JS.

## Swapping in your own proof screenshots

Drop your images into `assets/proof/`, keeping the same filenames (or update the `src` attributes in `index.html`'s `.proof-grid` section if you rename them). Recommended: crop tight, keep text legible at small sizes, and keep each image under ~500KB so the page stays fast on mobile.

## How the live data works (and its limits)

- Positions are **geocentric** (as seen from Earth's center), matching how astrology has always worked — no birth location needed for the matrix.
- "Tropical sign" = the body's true ecliptic-of-date longitude (the same apparent geocentric longitude astrology software uses), sliced into 12 equal 30° bins starting at 0° Aries.
- "True Sky constellation" = the body's J2000 right ascension/declination matched against the official 1930 IAU constellation boundaries, via `Astronomy.Constellation()`.
- If a visitor is offline or the CDN script fails to load, the page falls back to a real static example snapshot (captured 2026-08-15, Kansas City, MO) and clearly labels it as such — the page never silently shows fake "live" data.
- This is a demonstration/advocacy tool, not a full natal-chart engine. For a real birth chart (with houses, aspects, and location-specific data), the CTAs point to starchart13.com.

## Customizing the social post generator

`buildSocialPosts()` in `app.js` picks the day's headline planet and writes three platform-specific drafts. Edit the template strings directly to change voice, add your handle, or adjust hashtag counts — TikTok is intentionally kept to 3–5 tags, Instagram 15–30, Facebook 0–2, matching what performs best on each platform.

## Credits

- Ephemeris math: [Astronomy Engine](https://github.com/cosinekitty/astronomy) by Don Cross (MIT License).
- Fonts: Cinzel, Space Grotesk, JetBrains Mono via Google Fonts.
- Brand reference: [starchart13.com](https://starchart13.com).

## License

MIT — do whatever you want with the code. Swap the screenshots for your own before publishing; the four included are example captures, not stock assets.
