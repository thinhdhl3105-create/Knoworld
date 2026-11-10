// v28: Giờ Việt Nam -> pha trong ngày + bảng màu bầu trời / thành phố cho đầu các trang con.

export function vnHour(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date);
  const h = Number(parts.find((p) => p.type === 'hour')?.value || 0) % 24;
  const m = Number(parts.find((p) => p.type === 'minute')?.value || 0);
  return h + m / 60;
}

export function vnClock(date = new Date()) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
}

// morning 5–9 · day 9–15 · afternoon 15–17:30 · dusk 17:30–19 · night
export function phaseOf(h) {
  if (h >= 5 && h < 9) return 'morning';
  if (h >= 9 && h < 15) return 'day';
  if (h >= 15 && h < 17.5) return 'afternoon';
  if (h >= 17.5 && h < 19) return 'dusk';
  return 'night';
}

export const PHASES = {
  morning: {
    label: 'Morning',
    sky: ['#6aaee8', '#b6d9f3', '#ffd6b3'],
    sun: { kind: 'sun', x: '50%', y: 150, size: 70, color: '#ffe2a6', glow: 'rgba(255,214,150,.6)' },
    back: ['#b4cbe8', '#9fb8da', '#c8daf0'], mid: ['#77739a', '#5c587f', '#9590b8'], front: ['#4b4566', '#322c48', '#726a96'],
    win: '#d6e0f0', wo: 0.5, ground: '#2c2839', haze: 0.2, reflect: 'blur(26px) brightness(.55) saturate(1.3)',
  },
  day: {
    label: 'Daytime',
    sky: ['#4f9fe8', '#8cc4f2', '#cfe6fb'],
    sun: { kind: 'sun', x: '72%', y: 52, size: 64, color: '#fff3c4', glow: 'rgba(255,236,170,.55)' },
    back: ['#9db5d8', '#88a2c9', '#b2c7e4'], mid: ['#6a6a92', '#4f4d74', '#8886ad'], front: ['#4a4466', '#2f2a45', '#6e6794'],
    win: '#cfdcee', wo: 0.55, ground: '#2a2638', haze: 0.22, reflect: 'blur(26px) brightness(.6) saturate(1.35)',
  },
  afternoon: {
    label: 'Afternoon',
    sky: ['#4d8fd6', '#9cc3e8', '#f0d39c'],
    sun: { kind: 'sun', x: '66%', y: 86, size: 66, color: '#fff0bd', glow: 'rgba(255,226,160,.55)' },
    back: ['#b3c1db', '#9eaecc', '#c6d2e6'], mid: ['#716b8f', '#565174', '#8d88ad'], front: ['#47405f', '#2e2944', '#6a6288'],
    win: '#c9d4e6', wo: 0.5, ground: '#2a2637', haze: 0.2, reflect: 'blur(26px) brightness(.6) saturate(1.35)',
  },
  dusk: {
    label: 'Sunset',
    sky: ['#2b2a62', '#7d5aa0', '#f0a06c'],
    sun: { kind: 'sun', x: '86%', y: 196, size: 84, color: '#ffb067', glow: 'rgba(255,150,90,.5)' },
    back: ['#9a76a6', '#83618f', '#b08cba'], mid: ['#5a4878', '#40325c', '#77649a'], front: ['#3a3156', '#241e3a', '#5a4d80'],
    win: '#ffd27a', wo: 0.6, ground: '#221d33', haze: 0.3, reflect: 'blur(26px) brightness(.7) saturate(1.4)',
  },
  night: {
    label: 'Night',
    sky: ['#070a22', '#141236', '#251c48'],
    sun: { kind: 'moon', x: '90%', y: 60, size: 44, color: '#f4f1ff', glow: 'rgba(200,200,255,.25)' },
    back: ['#2c2856', '#221f46', '#3a3568'], mid: ['#262040', '#1a1630', '#38305a'], front: ['#221d38', '#15111f', '#3a3360'],
    win: '#ffd27a', wo: 0.85, ground: '#16131f', haze: 0.5, reflect: 'blur(22px) brightness(.9) saturate(1.5)',
  },
};
