'use client';

// v48: ngày lễ đang diễn ra (theo giờ Việt Nam) + lời chúc tuỳ chỉnh của admin.
// Xem trước: thêm ?holiday=tet (newyear, women83, reunification, labour, women2010, teachers, christmas)
// vào URL; ?holiday=off để thoát xem trước.
import { useEffect, useState } from 'react';
import { activeHoliday, holidayById, decorate, holidayDate, vnToday } from '@/lib/holidays';
import { loadHolidaySettings } from '@/lib/holidayWishes';

const KEY = 'kw_holiday_preview';
let settingsP = null;
export const getSettings = (fresh) => {
  if (!settingsP || fresh) settingsP = loadHolidaySettings().then((d) => d || {}).catch(() => ({}));
  return settingsP;
};

// Năm của lần diễn ra gần nhất (chưa qua) của ngày lễ — dùng khi xem trước.
function upcomingYear(h) {
  const t = vnToday();
  const [d, m, y] = holidayDate(h, t.y);
  return y * 10000 + m * 100 + d >= t.y * 10000 + t.m * 100 + t.d ? t.y : t.y + 1;
}

function compute(settings) {
  let id = null;
  try {
    const q = new URLSearchParams(window.location.search).get('holiday');
    if (q === 'off') sessionStorage.removeItem(KEY);
    else if (q && holidayById(q)) sessionStorage.setItem(KEY, q);
    id = sessionStorage.getItem(KEY);
  } catch { /* ignore */ }
  let h = null;
  if (id && holidayById(id)) { const base = holidayById(id); h = { ...decorate(base, upcomingYear(base)), preview: true }; }
  else h = activeHoliday();
  if (!h) return null;
  const s = (settings || {})[h.id] || {};
  if (s.enabled === false && !h.preview) return null;
  return { ...h, title: s.title || h.title, message: s.message || h.message, custom: !!(s.title || s.message), enabled: s.enabled !== false };
}

export function useHoliday() {
  const [h, setH] = useState(null);
  useEffect(() => {
    let alive = true, settings = {};
    const up = () => alive && setH(compute(settings));
    up();
    getSettings().then((s) => { settings = s; up(); });
    const onChange = (e) => { if (e.detail?.fresh) getSettings(true).then((s) => { settings = s; up(); }); else up(); };
    window.addEventListener('kw-holiday-change', onChange);
    const t = setInterval(up, 10 * 60 * 1000);
    return () => { alive = false; window.removeEventListener('kw-holiday-change', onChange); clearInterval(t); };
  }, []);
  return h;
}

export function setHolidayPreview(id) {
  try { if (id) sessionStorage.setItem(KEY, id); else sessionStorage.removeItem(KEY); } catch { /* ignore */ }
  try {
    const u = new URL(window.location.href);
    if (u.searchParams.has('holiday')) { u.searchParams.delete('holiday'); window.history.replaceState(null, '', u.toString()); }
  } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent('kw-holiday-change'));
}
export const refreshHolidaySettings = () => window.dispatchEvent(new CustomEvent('kw-holiday-change', { detail: { fresh: true } }));
