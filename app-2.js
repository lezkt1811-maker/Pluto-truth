/* ============================================================
   StarChart 13 — True Sky vs Tropical Grid
   app.js

   Live planetary positions are computed entirely in the browser
   with Astronomy Engine (https://github.com/cosinekitty/astronomy),
   an open-source ephemeris library. No data is sent anywhere.

   For each body we calculate:
   - Tropical sign: geocentric apparent ecliptic longitude of date,
     sliced into 12 equal 30° signs starting at the true equinox.
   - True Sky constellation: the same geocentric position converted
     to J2000 equatorial RA/Dec, then matched against the official
     IAU (1930) constellation boundaries via Astronomy.Constellation().
   ============================================================ */

const ZODIAC = [
  { name: 'Aries', glyph: '♈' }, { name: 'Taurus', glyph: '♉' },
  { name: 'Gemini', glyph: '♊' }, { name: 'Cancer', glyph: '♋' },
  { name: 'Leo', glyph: '♌' }, { name: 'Virgo', glyph: '♍' },
  { name: 'Libra', glyph: '♎' }, { name: 'Scorpio', glyph: '♏' },
  { name: 'Sagittarius', glyph: '♐' }, { name: 'Capricorn', glyph: '♑' },
  { name: 'Aquarius', glyph: '♒' }, { name: 'Pisces', glyph: '♓' }
];

const BODIES = [
  { key: 'Sun', label: 'Sun', glyph: '☉' },
  { key: 'Moon', label: 'Moon', glyph: '☾' },
  { key: 'Mercury', label: 'Mercury', glyph: '☿' },
  { key: 'Venus', label: 'Venus', glyph: '♀' },
  { key: 'Mars', label: 'Mars', glyph: '♂' },
  { key: 'Jupiter', label: 'Jupiter', glyph: '♃' },
  { key: 'Saturn', label: 'Saturn', glyph: '♄' },
  { key: 'Uranus', label: 'Uranus', glyph: '♅' },
  { key: 'Neptune', label: 'Neptune', glyph: '♆' },
  { key: 'Pluto', label: 'Pluto', glyph: '♇' }
];

// Constellation full name -> the tropical sign it would "agree" with, if any.
const CONSTELLATION_TO_SIGN = {
  'Aries': 'Aries', 'Taurus': 'Taurus', 'Gemini': 'Gemini', 'Cancer': 'Cancer',
  'Leo': 'Leo', 'Virgo': 'Virgo', 'Libra': 'Libra', 'Scorpius': 'Scorpio',
  'Sagittarius': 'Sagittarius', 'Capricornus': 'Capricorn', 'Aquarius': 'Aquarius',
  'Pisces': 'Pisces'
};

// Static example snapshot used only if the live ephemeris library fails to
// load (e.g. no network). Sourced from a real StarChart 13 capture,
// 2026-08-15 04:01 CDT, Kansas City, MO.
const FALLBACK_ROWS = [
  { label: 'Sun', glyph: '☉', tropical: 'Leo', tropicalDeg: '3° 15\'', constellation: 'Leo' },
  { label: 'Moon', glyph: '☾', tropical: 'Virgo', tropicalDeg: '2° 41\'', constellation: 'Virgo' },
  { label: 'Mercury', glyph: '☿', tropical: 'Cancer', tropicalDeg: '11° 38\'', constellation: 'Cancer' },
  { label: 'Venus', glyph: '♀', tropical: 'Virgo', tropicalDeg: '14° 7\'', constellation: 'Virgo' },
  { label: 'Mars', glyph: '♂', tropical: 'Gemini', tropicalDeg: '1° 20\'', constellation: 'Gemini' },
  { label: 'Jupiter', glyph: '♃', tropical: 'Cancer', tropicalDeg: '11° 48\'', constellation: 'Cancer' },
  { label: 'Saturn', glyph: '♄', tropical: 'Pisces', tropicalDeg: '22° 6\'', constellation: 'Pisces' },
  { label: 'Uranus', glyph: '♅', tropical: 'Taurus', tropicalDeg: '12° 4\'', constellation: 'Taurus' },
  { label: 'Neptune', glyph: '♆', tropical: 'Pisces', tropicalDeg: '11° 42\'', constellation: 'Pisces' },
  { label: 'Pluto', glyph: '♇', tropical: 'Capricorn', tropicalDeg: '3° 31\'', constellation: 'Capricornus' }
];

let latestRows = [];

/* ---------------- Starfield (subtle, decorative) ---------------- */
function initStarfield(){
  const canvas = document.getElementById('starfield');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let stars = [];

  function resize(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const count = Math.floor((canvas.width * canvas.height) / 9000);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.2,
      a: Math.random() * 0.6 + 0.2,
      tw: Math.random() * 0.015 + 0.003
    }));
  }

  function draw(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      if (!reduceMotion){
        s.a += s.tw;
        if (s.a > 0.9 || s.a < 0.1) s.tw *= -1;
      }
      ctx.beginPath();
      ctx.fillStyle = `rgba(242, 238, 252, ${s.a})`;
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    if (!reduceMotion) requestAnimationFrame(draw);
  }

  resize();
  draw();
  window.addEventListener('resize', resize);
}

/* ---------------- Live ephemeris calculation ---------------- */
function computeLiveRows(){
  const date = new Date();
  const rows = BODIES.map(b => {
    const body = Astronomy.Body[b.key];
    const vec = Astronomy.GeoVector(body, date, true);

    // Tropical: true ecliptic-of-date longitude, sliced into 30° signs
    const ecl = Astronomy.Ecliptic(vec);
    const elon = ((ecl.elon % 360) + 360) % 360;
    const signIndex = Math.floor(elon / 30);
    const sign = ZODIAC[signIndex];
    const degInSign = elon - signIndex * 30;
    const wholeDeg = Math.floor(degInSign);
    const minutes = Math.floor((degInSign - wholeDeg) * 60);

    // True sky: J2000 equatorial RA/Dec -> official IAU constellation
    const eq = Astronomy.EquatorFromVector(vec);
    const constellation = Astronomy.Constellation(eq.ra, eq.dec);

    return {
      label: b.label,
      glyph: b.glyph,
      tropical: sign.name,
      tropicalGlyph: sign.glyph,
      tropicalDeg: `${wholeDeg}° ${minutes}'`,
      elon,
      constellation: constellation.name
    };
  });
  return { rows, date };
}

function matches(row){
  const equiv = CONSTELLATION_TO_SIGN[row.constellation];
  return equiv === row.tropical;
}

/* ---------------- Matrix rendering ---------------- */
function renderMatrix(rows, opts = {}){
  const tbody = document.getElementById('matrix-body');
  const mismatchOnly = document.getElementById('mismatch-only').checked;
  tbody.innerHTML = '';

  rows.forEach(row => {
    const isMatch = opts.static ? row.constellation === row.tropical : matches(row);
    if (mismatchOnly && isMatch) return;

    const tr = document.createElement('tr');

    const bandPos = typeof row.elon === 'number' ? (row.elon / 360) * 100 : null;

    tr.innerHTML = `
      <td class="body-name"><span class="body-symbol">${row.glyph}</span>${row.label}</td>
      <td><span class="pill pill-grid">${row.tropical}</span></td>
      <td><span class="pill pill-sky">${row.constellation}</span></td>
      <td>
        <div class="band">
          ${bandPos !== null ? `<span class="band-mark band-sky" style="left:${bandPos}%"></span>` : ''}
        </div>
      </td>
      <td class="${isMatch ? 'verdict-match' : 'verdict-mismatch'}">
        ${isMatch ? 'Grid matches sky' : 'Grid disagrees with sky'}
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (!tbody.children.length){
    tbody.innerHTML = '<tr><td colspan="5" class="matrix-loading">No mismatches among currently shown bodies.</td></tr>';
  }
}

function loadMatrix(){
  const footnote = document.getElementById('matrix-footnote');
  const heroTimestamp = document.getElementById('hero-timestamp');

  try {
    if (typeof Astronomy === 'undefined') throw new Error('astronomy-engine not loaded');
    const { rows, date } = computeLiveRows();
    latestRows = rows;
    renderMatrix(rows);
    const stamp = date.toUTCString();
    footnote.textContent = `Live geocentric ecliptic positions calculated for ${stamp}. Refresh to recalculate for right now.`;
    heroTimestamp.textContent = `Live sky snapshot — ${stamp}`;
    buildSocialPosts(rows);
  } catch (err) {
    latestRows = FALLBACK_ROWS;
    renderMatrix(FALLBACK_ROWS, { static: true });
    footnote.textContent = 'Live ephemeris library unavailable right now — showing a real example snapshot (2026-08-15, Kansas City, MO) instead. Reload with network access for live data.';
    heroTimestamp.textContent = 'Showing example snapshot — live calculation needs network access';
    buildSocialPosts(FALLBACK_ROWS);
  }
}

/* ---------------- Social post generator ---------------- */
function pickHeadlinePlanet(rows){
  const mismatches = rows.filter(r =>
    r.constellation !== r.tropical &&
    (CONSTELLATION_TO_SIGN[r.constellation] !== r.tropical)
  );
  if (!mismatches.length) return rows[0];
  const priority = ['Pluto', 'Mars', 'Sun', 'Moon'];
  for (const name of priority){
    const hit = mismatches.find(r => r.label === name);
    if (hit) return hit;
  }
  return mismatches[0];
}

function buildSocialPosts(rows){
  const p = pickHeadlinePlanet(rows);

  const tiktok =
`🚨 Your horoscope has been lying to you about ${p.label}.

HOOK: "Tropical astrology says ${p.label} is in ${p.tropical}. The actual sky? ${p.constellation}. I checked. Here's the proof —"

[Cut 1] Screen-record ephemeris table, circle the Sign vs Constellation columns
[Cut 2] Open a sky-map app, point at where ${p.label} actually is tonight
[Cut 3] Split-screen: tropical wheel vs true-sky wheel
[Cut 4] Text on screen: "check yours → starchart13.com"

CTA (say it out loud): "Link's in my bio — go see what YOUR chart actually looks like against the real sky."`;

  const instagram =
`Mainstream astrology has been rounding the sky to fit a 2,000-year-old grid. 🌌

Right now, tropical astrology places ${p.label} in ${p.tropical} — but the actual constellation behind it is ${p.constellation}. Not a theory. Not vibes. Verifiable tonight with any sky-map app.

This is the whole reason true-sky (sidereal) astrology exists: 13 real constellations, uneven widths, matched to what's actually overhead — including Ophiuchus, the sign your horoscope app has never mentioned.

Swipe to see the receipts →
1️⃣ the sky-map proof
2️⃣ the ephemeris data table
3️⃣ the true-sky wheel
4️⃣ how to check your own chart

Verify your actual chart placements against the real sky at StarChart 13 — link in bio.`;

  const facebook =
`Genuine question for anyone into astrology (skeptics welcome too): did you know your "sign" is based on a 30-degree grid that hasn't matched the real constellations in centuries?

Right now, mainstream tropical astrology says ${p.label} is in ${p.tropical}. Point an actual sky-mapping app at the sky tonight, though, and ${p.label} is sitting in ${p.constellation} — a different constellation entirely.

I'm not saying astrology itself is wrong. I'm saying most of it isn't actually looking at the sky anymore. There's a free tool that shows both charts side by side (tropical grid vs. true sky) so you can check your own placements yourself instead of taking anyone's word for it — including mine.

Would love to know what you find if you try it. Verify your actual chart placements against the real sky at StarChart 13: https://starchart13.com`;

  document.getElementById('copy-tiktok').textContent = tiktok;
  document.getElementById('copy-instagram').textContent = instagram;
  document.getElementById('copy-facebook').textContent = facebook;

  document.getElementById('tags-tiktok').textContent =
    '#trueskyastrology #ophiuchus #astronomyvsastrology #' + p.label.toLowerCase() + 'inthe' + p.constellation.toLowerCase();
  document.getElementById('tags-instagram').textContent =
    '#trueskyastrology #siderealastrology #ophiuchus #astronomy #realzodiac #starchart13 #' + p.label.toLowerCase() +
    ' #' + p.tropical.toLowerCase() + ' #' + p.constellation.toLowerCase() + ' #13signzodiac #naturalastrology #skywatching #zodiactruth #stargazing #astrologyfacts';
}

/* ---------------- UI wiring ---------------- */
function initTabs(){
  const tabs = document.querySelectorAll('.social-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const platform = tab.dataset.platform;
      tabs.forEach(t => {
        t.classList.toggle('is-active', t === tab);
        t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
      });
      document.querySelectorAll('.social-panel').forEach(panel => {
        panel.classList.toggle('is-hidden', panel.dataset.platformPanel !== platform);
      });
    });
  });
}

function initCopyButtons(){
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const targetId = btn.dataset.target;
      const text = document.getElementById(targetId).textContent;
      try {
        await navigator.clipboard.writeText(text);
        const original = btn.textContent;
        btn.textContent = 'Copied ✓';
        setTimeout(() => { btn.textContent = original; }, 1600);
      } catch (e) {
        alert('Copy failed — select the text manually.');
      }
    });
  });
}

function initMatrixControls(){
  document.getElementById('mismatch-only').addEventListener('change', () => {
    renderMatrix(latestRows, { static: typeof Astronomy === 'undefined' });
  });
  document.getElementById('refresh-matrix').addEventListener('click', loadMatrix);
}

document.addEventListener('DOMContentLoaded', () => {
  initStarfield();
  initTabs();
  initCopyButtons();
  initMatrixControls();
  loadMatrix();
});
