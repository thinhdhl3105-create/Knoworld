// Overlay markup for the Knoworld City scene (styles in city.css, all scoped under .kwc)
export function cityTemplate(hasAdmin) {
  return `
<canvas class="kwc-sky" data-id="sky" aria-hidden="true"></canvas>
<div class="kwc-stage" data-id="stage"></div>
<div class="kwc-labels" data-id="labels"></div>

<div class="kwc-cities kwc-ui" role="toolbar" aria-label="Districts">
  <button type="button" data-city="main"><span class="dot" style="background:#c6bfff"></span>Main City</button>
  ${hasAdmin ? '<button type="button" data-city="admin"><span class="dot" style="background:#7ee8ff"></span>Admin City 🔒</button>' : ''}
  <button type="button" data-city="profile"><span class="dot" style="background:#ff9bd2"></span>Profile City</button>
  <button type="button" data-city="games"><span class="dot" style="background:#5ee0a0"></span>Game Island</button>
  <button type="button" data-city="temple"><span class="dot" style="background:#ffb347"></span>Temple Isle</button>
  ${hasAdmin ? '<button type="button" data-city="island"><span class="dot" style="background:#ffd27a"></span>Thinh\'s Island 🔒</button>' : ''}
  <button type="button" data-city="home">Overview</button>
</div>

<div class="kwc-clock kwc-panel kwc-ui" data-id="clock" aria-label="Time, weather and land">
  <button type="button" class="head" data-id="clockHead">
    <span class="t" data-id="time">--:--</span><span class="wx" data-id="wx"></span><span class="chev" aria-hidden="true">⚙ settings</span>
  </button>
  <div class="ph" data-id="phase">Loading…</div>
  <div class="ctl">
    <input type="range" data-id="hour" min="0" max="24" step="0.05" value="12" aria-label="Time of day">
    <div class="ticks" aria-hidden="true"><span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>24h</span></div>
    <div class="row">
      <button data-id="real" class="on" type="button">Real time</button>
      <button data-id="play" type="button">Fast-forward 24h</button>
    </div>
    <span class="lbl-sm">Weather</span>
    <div class="seg" role="group" aria-label="Weather">
      <button type="button" data-w="auto" class="on">Auto</button>
      <button type="button" data-w="clear">Sunny</button>
      <button type="button" data-w="rain">Rain</button>
    </div>
    <span class="lbl-sm">Land</span>
    <div class="seg seg4" role="group" aria-label="Land">
      <button type="button" data-b="sea">🌊 Sea</button>
      <button type="button" data-b="desert">🏜️ Desert</button>
      <button type="button" data-b="rocky">⛰️ Mountains</button>
      <button type="button" data-b="forest">🌲 Forest</button>
    </div>
  </div>
</div>

<div class="kwc-card kwc-panel kwc-ui" data-id="card" hidden>
  <div class="eyebrow" data-id="cEyebrow"></div>
  <h2 data-id="cName"></h2>
  <p data-id="cDesc"></p>
  <code data-id="cRoute"></code>
  <div class="list" data-id="cList"></div>
  <div class="row">
    <a class="btn primary" data-id="cOpen" href="#">Open page →</a>
    <button data-id="cBack" type="button">Overview</button>
  </div>
  <div class="note" data-id="cNote"></div>
</div>

<div class="kwc-tip kwc-panel" data-id="tip" hidden></div>
<div class="kwc-fail" data-id="fail" hidden>Your browser can't show the 3D city (WebGL is off). Use the menu above to explore Knoworld.</div>`;
}
