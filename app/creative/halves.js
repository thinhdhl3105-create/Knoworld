// v68: VẼ TIẾP 30 GIÂY — nửa bức tranh có sẵn (nét đen, khung 400×500, chỉ vẽ nửa trái tới x = 200).
// Học sinh vẽ nốt nửa phải thành một thứ khác hẳn: nửa ngựa nửa cọp, nửa ấm trà nửa tàu ngầm…
const S = 'fill="none" stroke="#1b1540" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"';
const DOT = 'fill="#1b1540"';

export const HALF_DRAWINGS = [
  {
    id: 'horse', name: 'con ngựa', hint: 'nửa sau là con cọp? con cá? hay chiếc xe máy?',
    svg: `<path ${S} d="M200 150 C178 140 160 128 146 112 L138 82 L126 108 C112 112 98 124 86 142 L52 200 C40 220 42 246 62 254 C80 262 100 252 112 238 L130 220 C140 250 150 278 156 300 L150 430 L172 430 L178 330 C186 320 194 316 200 316"/>
      <path ${S} d="M146 112 C160 100 176 98 200 102"/>
      <path ${S} d="M150 118 l10 -16 l6 16 l10 -16 l6 16 l10 -16 l6 16"/>
      <circle cx="112" cy="160" r="7" ${DOT}/><circle cx="62" cy="236" r="5" ${DOT}/>
      <path ${S} d="M70 254 C80 250 92 250 100 246"/>
      <path ${S} d="M150 430 l-6 18 l34 0 l-6 -18"/>`,
  },
  {
    id: 'fish', name: 'con cá', hint: 'nửa sau là con gà? quả tên lửa? hay cây đàn?',
    svg: `<path ${S} d="M200 160 C140 150 80 180 40 250 C80 320 140 350 200 340"/>
      <circle cx="96" cy="230" r="14" ${S}/><circle cx="99" cy="232" r="6" ${DOT}/>
      <path ${S} d="M50 262 C60 268 72 270 82 266"/>
      <path ${S} d="M140 190 C126 230 126 270 140 312"/>
      <path ${S} d="M150 165 C160 130 180 112 200 108"/>
      <path ${S} d="M155 300 C150 330 160 360 185 380"/>
      <path ${S} d="M168 220 a8 8 0 1 0 0.1 0 M178 268 a8 8 0 1 0 0.1 0"/>`,
  },
  {
    id: 'teapot', name: 'cái ấm trà', hint: 'nửa kia là con voi? tàu ngầm? hay robot?',
    svg: `<path ${S} d="M200 190 L160 190 C120 196 96 240 96 290 C96 340 130 370 170 374 L200 374"/>
      <path ${S} d="M104 262 C70 250 50 220 30 190 C46 210 62 232 70 260 C76 282 88 300 100 312"/>
      <path ${S} d="M200 190 L200 172 L160 172 C150 172 148 180 150 190"/>
      <path ${S} d="M200 172 L200 150 C190 140 186 132 200 124"/>
      <path ${S} d="M120 300 C140 312 170 316 200 316"/>
      <path ${S} d="M150 374 L148 392 L200 392"/>`,
  },
  {
    id: 'cat', name: 'khuôn mặt mèo', hint: 'nửa kia là mặt cú? mặt rồng? hay mặt đồng hồ?',
    svg: `<path ${S} d="M200 380 C140 380 80 350 70 280 C64 240 76 200 92 176 L84 92 L142 140 C160 134 180 132 200 132"/>
      <path ${S} d="M98 114 L104 160 L128 142"/>
      <path ${S} d="M120 236 C130 218 156 218 166 236 C156 254 130 254 120 236 Z"/><circle cx="143" cy="236" r="8" ${DOT}/>
      <path ${S} d="M200 288 L184 276 L200 276"/>
      <path ${S} d="M200 296 C196 312 184 320 172 316"/>
      <path ${S} d="M150 300 L60 286 M150 312 L58 316 M152 324 L70 346"/>`,
  },
  {
    id: 'rooster', name: 'con gà trống', hint: 'nửa sau là con rắn? chiếc ô tô? hay cái cây?',
    svg: `<path ${S} d="M200 210 C170 200 150 190 142 168 C136 150 140 130 156 118 C140 112 134 98 142 88 C150 96 154 92 156 80 C164 90 168 88 174 78 C180 90 184 96 180 110 C192 120 196 136 194 150"/>
      <path ${S} d="M142 140 L114 152 L142 160"/>
      <path ${S} d="M144 164 C134 180 140 196 152 186 C156 180 154 172 148 166"/>
      <circle cx="164" cy="134" r="6" ${DOT}/>
      <path ${S} d="M194 150 C190 180 196 200 200 210"/>
      <path ${S} d="M200 260 C180 280 170 320 180 350 L176 420 M180 350 L196 420 M168 420 L188 420 M188 420 L206 420"/>`,
  },
  {
    id: 'car', name: 'chiếc ô tô', hint: 'nửa sau là con rùa? chiếc thuyền? hay con khủng long?',
    svg: `<path ${S} d="M200 220 L140 220 C120 222 106 240 96 262 L50 270 C36 274 30 290 30 306 L30 330 C30 340 36 346 46 346 L70 346"/>
      <path ${S} d="M130 346 L200 346"/>
      <circle cx="100" cy="346" r="30" ${S}/><circle cx="100" cy="346" r="10" ${DOT}/>
      <path ${S} d="M126 236 L112 262 L200 262 L200 236 Z"/>
      <path ${S} d="M36 298 L56 298"/><path ${S} d="M160 286 L176 286"/>`,
  },
  {
    id: 'rocket', name: 'tên lửa', hint: 'nửa kia là con mực? cây kem? hay toà lâu đài?',
    svg: `<path ${S} d="M200 50 C160 90 140 150 140 230 L140 360 L200 360"/>
      <path ${S} d="M140 300 L96 350 L96 400 L140 370"/>
      <circle cx="200" cy="200" r="34" ${S}/>
      <path ${S} d="M150 360 L160 400 L200 400"/>
      <path ${S} d="M168 400 C164 420 172 440 186 456 M188 400 C186 416 192 430 200 440"/>
      <path ${S} d="M150 120 L200 120"/>`,
  },
  {
    id: 'elephant', name: 'con voi', hint: 'nửa sau là con chim? chiếc máy bay? hay cái cốc?',
    svg: `<path ${S} d="M200 130 C160 120 120 130 100 160 C88 180 86 210 92 232 C80 260 66 300 62 340 C60 364 72 376 88 372 C98 368 100 356 94 348 C90 342 84 344 84 352"/>
      <path ${S} d="M100 248 C110 280 120 300 112 330"/>
      <path ${S} d="M140 150 C186 140 196 190 190 230 C186 262 170 282 148 286"/>
      <circle cx="122" cy="188" r="7" ${DOT}/>
      <path ${S} d="M120 262 C116 276 108 284 98 288"/>
      <path ${S} d="M150 300 L150 430 L182 430 L184 330 L200 320"/>`,
  },
  {
    id: 'house', name: 'ngôi nhà', hint: 'nửa kia là con rùa? cái bánh kem? hay một con quái vật?',
    svg: `<path ${S} d="M200 100 L60 220 M88 196 L88 400 L200 400"/>
      <path ${S} d="M110 150 L110 104 L140 104 L140 126"/>
      <path ${S} d="M114 104 C108 84 124 76 118 58"/>
      <path ${S} d="M112 260 L160 260 L160 310 L112 310 Z M136 260 L136 310 M112 285 L160 285"/>
      <path ${S} d="M170 400 L170 340 C170 326 200 326 200 326"/>`,
  },
  {
    id: 'guitar', name: 'cây đàn', hint: 'nửa kia là con hươu cao cổ? cái chai? hay con thiên nga?',
    svg: `<path ${S} d="M200 40 L184 40 L184 150 C150 160 136 190 146 220 C120 236 108 270 112 310 C118 370 160 400 200 400"/>
      <path ${S} d="M184 60 L170 60 M184 84 L170 84 M184 108 L170 108"/>
      <circle cx="200" cy="290" r="30" ${S}/>
      <path ${S} d="M168 350 L200 350"/>
      <path ${S} d="M192 150 L192 260"/>`,
  },
];

// v69: khung vẽ ngang 4:3 — nửa hình có sẵn nằm bên trái đường giữa, nửa phải để trống cho học sinh vẽ tiếp.
export function halfSvg(h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-133.33 0 666.67 500" width="960" height="720">
  <rect x="-133.33" y="0" width="666.67" height="500" fill="#fbfaff"/>
  <rect x="200" y="0" width="333.33" height="500" fill="#fff3f8"/>
  <line x1="200" y1="10" x2="200" y2="490" stroke="#ff8fb1" stroke-width="3" stroke-dasharray="10 10"/>
  <text x="366" y="476" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#ff8fb1" font-weight="700">vẽ tiếp ở đây →</text>
  ${h.svg}
</svg>`;
}
export const halfSvgUrl = (h) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(halfSvg(h))}`;
