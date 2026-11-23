// v59: Hình Lumi dùng chung (hướng dẫn người mới, Lumi lấp ló ở góc màn hình, Lumi đi dạo trong city 3D).
export function starPath(cx, cy, R, r) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const q = i % 2 ? r : R;
    d += `${i ? 'L' : 'M'}${(cx + q * Math.cos(a)).toFixed(1)} ${(cy + q * Math.sin(a)).toFixed(1)}`;
  }
  return `${d}Z`;
}

const DEFS = (p) => `<defs><radialGradient id="${p}B" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#f1edff"/><stop offset=".55" stop-color="#b9adff"/><stop offset="1" stop-color="#7d6cf0"/></radialGradient>
  <radialGradient id="${p}G"><stop offset="0" stop-color="#ffe9a8"/><stop offset="1" stop-color="#f6bd56" stop-opacity="0"/></radialGradient></defs>`;
const SHADOW = '<ellipse cx="50" cy="109" rx="24" ry="3.5" fill="rgba(0,0,0,.3)"/>';
const ANTENNA = '<path d="M50 27 Q47 15 56 9" stroke="#8d7fff" stroke-width="3" fill="none" stroke-linecap="round"/>';
const STAR = (p) => `<circle cx="57" cy="8" r="11" fill="url(#${p}G)"/><path d="${starPath(57, 8, 6, 2.6)}" fill="#ffd66e"/>`;
const FEET = '<ellipse cx="38" cy="103" rx="9" ry="5.5" fill="#6f5fe0"/><ellipse cx="62" cy="103" rx="9" ry="5.5" fill="#6f5fe0"/>';
const ARM_L = '<ellipse cx="14" cy="68" rx="7" ry="11" fill="#9a8cff" transform="rotate(25 14 68)"/>';
const ARM_R = '<ellipse cx="87" cy="62" rx="7" ry="11" fill="#9a8cff" transform="rotate(-35 87 62)"/>';
const BODY = (p) => `<path d="M50 24 C78 24 90 46 90 70 C90 92 72 103 50 103 C28 103 10 92 10 70 C10 46 22 24 50 24Z" fill="url(#${p}B)"/>
  <ellipse cx="50" cy="84" rx="15" ry="11" fill="#fff4c9" opacity=".6"/>
  <ellipse cx="34" cy="38" rx="9" ry="5" fill="#fff" opacity=".35" transform="rotate(-25 34 38)"/>`;
const EYE_L = '<ellipse cx="37" cy="58" rx="6" ry="7.5" fill="#241c45"/><circle cx="39" cy="55" r="2.3" fill="#fff"/><circle cx="35.5" cy="61" r="1" fill="#fff"/>';
const EYE_R = '<ellipse cx="63" cy="58" rx="6" ry="7.5" fill="#241c45"/><circle cx="65" cy="55" r="2.3" fill="#fff"/><circle cx="61.5" cy="61" r="1" fill="#fff"/>';
const WINK = 'd="M57 59 Q63 53 69 59" stroke="#241c45" stroke-width="2.6" fill="none" stroke-linecap="round"';
const CHEEKS = '<ellipse cx="27" cy="69" rx="5" ry="3" fill="#ff9bd2" opacity=".65"/><ellipse cx="73" cy="69" rx="5" ry="3" fill="#ff9bd2" opacity=".65"/>';
const M_HAPPY = 'd="M44 68 Q50 75 56 68" stroke="#241c45" stroke-width="2.6" fill="none" stroke-linecap="round"';
const M_WOW = 'cx="50" cy="71" rx="3.8" ry="4.8" fill="#241c45"';
const M_BIG = 'd="M42 67 Q50 80 58 67 Z" fill="#241c45"';

// Bản đầy đủ cho DOM: đổi biểu cảm bằng CSS [data-mood] (xem onboarding.css).
export const LUMI_SVG = `<svg viewBox="0 0 100 112" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  ${DEFS('kwo')}
  ${SHADOW}
  ${ANTENNA}
  <g class="kwo-star">${STAR('kwo')}</g>
  ${FEET}
  ${ARM_L}
  <g class="kwo-arm">${ARM_R}</g>
  ${BODY('kwo')}
  <g class="kwo-eyes">
    <g class="kwo-eye-l">${EYE_L}</g>
    <g class="kwo-eye-r">${EYE_R}</g>
  </g>
  <path class="kwo-wink" ${WINK}/>
  ${CHEEKS}
  <path class="kwo-m-happy" ${M_HAPPY}/>
  <ellipse class="kwo-m-wow" ${M_WOW}/>
  <path class="kwo-m-big" ${M_BIG}/>
</svg>`;

// Bản tĩnh (không cần CSS) để vẽ lên canvas — dùng cho Lumi trong city 3D.
// mood: happy | wow | big · blink: nhắm mắt · shadow: có bóng dưới chân
export function lumiStaticSvg({ mood = 'happy', blink = false, shadow = false } = {}) {
  const eyes = blink
    ? '<path d="M31 59 Q37 63 43 59 M57 59 Q63 63 69 59" stroke="#241c45" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
    : EYE_L + EYE_R;
  const mouth = mood === 'wow' ? `<ellipse ${M_WOW}/>` : mood === 'big' ? `<path ${M_BIG}/>` : `<path ${M_HAPPY}/>`;
  return `<svg viewBox="0 0 100 112" width="200" height="224" xmlns="http://www.w3.org/2000/svg">${DEFS('s')}${shadow ? SHADOW : ''}${ANTENNA}${STAR('s')}${FEET}${ARM_L}${ARM_R}${BODY('s')}${eyes}${CHEEKS}${mouth}</svg>`;
}
