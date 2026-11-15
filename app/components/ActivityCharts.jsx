'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchActivityStats } from '@/lib/activityStats';

// ---------------------------------------------------------------------------
// v55: Activity over time — active users & số liệu Dashboard theo từng ngày.
// Chỉ admin thấy (dashboard/page.js gắn khi isAdmin). Dữ liệu: RPC
// admin_activity_stats (migration_v55_activity_stats.sql).
// ---------------------------------------------------------------------------

const RANGES = [
  { days: 7, label: '7 ngày' },
  { days: 30, label: '30 ngày' },
  { days: 90, label: '90 ngày' },
];

const METRICS = {
  active: { label: 'Active users', color: '#c6bfff', sub: 'Số người khác nhau vào web mỗi ngày · đường vàng = trung bình 7 ngày' },
  views: { label: 'Views', color: '#6fd6c4', sub: 'Lượt xem nội dung mỗi ngày (1 lượt / người / mục / ngày)' },
  hearts: { label: 'Hearts', color: '#ff8fa3', sub: 'Lượt thả tim mỗi ngày' },
  entries: { label: 'New entries', color: '#7cb8ff', sub: 'Số nội dung mới được đăng mỗi ngày' },
};

const GROWTH = [
  { key: 'concepts', label: 'Concepts', color: '#c6bfff' },
  { key: 'connections', label: 'Map connections', color: '#f6bd56' },
  { key: 'research', label: 'Research papers', color: '#6fd6c4' },
  { key: 'cases', label: 'Case studies', color: '#ff8fa3' },
  { key: 'foundations', label: 'Foundations', color: '#7cb8ff' },
  { key: 'frameworks', label: 'Frameworks', color: '#b5e07a' },
];

const AVG_COLOR = '#f6bd56';
const UP = '#7fdcae';
const DOWN = '#ff9a9a';
const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const sum = (a) => a.reduce((s, v) => s + (v || 0), 0);
const last = (a, n, off = 0) => a.slice(Math.max(0, a.length - n - off), a.length - off);
const ma7 = (a) => a.map((_, i) => { const w = a.slice(Math.max(0, i - 6), i + 1); return sum(w) / w.length; });
const parseDay = (s) => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const fmtShort = (d) => `${d.getDate()}/${d.getMonth() + 1}`;
const fmtLong = (d) => `${WEEKDAYS[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
const fmtNum = (v) => Number(v || 0).toLocaleString('vi-VN');

function niceStep(v) {
  const p = 10 ** Math.floor(Math.log10(v || 1));
  const n = v / p;
  return Math.max(1, (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p);
}

function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

// ---- Biểu đồ thời gian dùng chung (cột + đường) ------------------------------
function TimeChart({ dates, series, bars = false, height = 300 }) {
  const [ref, W] = useWidth();
  const [hoverRaw, setHover] = useState(null);
  const shown = series.filter((s) => s.on !== false);
  const n = dates.length;
  // Đổi khoảng thời gian khi đang rê chuột -> bỏ chỉ số cũ nằm ngoài dữ liệu mới.
  const hover = hoverRaw != null && hoverRaw < n ? hoverRaw : null;
  const m = { t: 12, r: 14, b: 26, l: 40 };
  const iw = Math.max(10, W - m.l - m.r);
  const ih = height - m.t - m.b;

  const all = shown.flatMap((s) => s.values);
  const lo = bars || !all.length ? 0 : Math.min(...all) * 0.9;
  const hi = Math.max(1, ...all) * 1.04;
  const step = niceStep((hi - lo) / 4);
  const minV = Math.floor(lo / step) * step;
  const maxV = Math.max(minV + step, Math.ceil(hi / step) * step);
  const ticks = Math.round((maxV - minV) / step);

  const X = (i) => m.l + (bars ? (i + 0.5) * (iw / n) : n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const Y = (v) => m.t + ih - ((v - minV) / (maxV - minV)) * ih;
  const labelEvery = Math.ceil(n / Math.max(2, Math.floor(iw / 62)));
  const bw = Math.max(2, Math.min(22, (iw / Math.max(1, n)) * 0.62));

  const onMove = (ev) => {
    const pt = ev.touches ? ev.touches[0] : ev;
    const r = ev.currentTarget.ownerSVGElement.getBoundingClientRect();
    const px = pt.clientX - r.left;
    let i = bars ? Math.floor((px - m.l) / (iw / n)) : Math.round(((px - m.l) / iw) * (n - 1));
    i = Math.max(0, Math.min(n - 1, i));
    setHover(i);
  };

  const tipLeft = hover != null && X(hover) > W - 200;

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {W > 0 && n > 0 && (
        <svg width={W} height={height} className="block">
          {Array.from({ length: ticks + 1 }, (_, k) => {
            const v = minV + step * k;
            return (
              <g key={k}>
                <line x1={m.l} x2={W - m.r} y1={Y(v)} y2={Y(v)} stroke={`rgba(255,255,255,${k === 0 ? 0.14 : 0.06})`} />
                <text x={m.l - 8} y={Y(v) + 4} textAnchor="end" fontSize="11" fill="#a9a4b8">{fmtNum(Math.round(v))}</text>
              </g>
            );
          })}
          {dates.map((d, i) =>
            (n - 1 - i) % labelEvery === 0 ? (
              <text key={i} x={X(i)} y={height - 6} textAnchor="middle" fontSize="11" fill="#a9a4b8">{fmtShort(d)}</text>
            ) : null
          )}
          {shown.map((s) =>
            s.type === 'bar' ? (
              <g key={s.name}>
                {s.values.map((v, i) => (
                  <rect key={i} x={X(i) - bw / 2} y={Y(v)} width={bw} height={Math.max(0, Y(minV) - Y(v))}
                    rx={Math.min(4, bw / 2)} fill={s.color} fillOpacity={hover === i ? 1 : n > 40 ? 0.7 : 0.85} />
                ))}
              </g>
            ) : (
              <polyline key={s.name} points={s.values.map((v, i) => `${X(i)},${Y(v)}`).join(' ')}
                fill="none" stroke={s.color} strokeWidth={s.width || 2} strokeLinejoin="round" strokeLinecap="round" />
            )
          )}
          {hover != null && (
            <g>
              <line x1={X(hover)} x2={X(hover)} y1={m.t} y2={m.t + ih} stroke="rgba(255,255,255,.25)" strokeDasharray="3 3" />
              {shown.filter((s) => s.type !== 'bar').map((s) => (
                <circle key={s.name} cx={X(hover)} cy={Y(s.values[hover])} r="4" fill={s.color} stroke="#13121b" strokeWidth="2" />
              ))}
            </g>
          )}
          <rect x={m.l} y={m.t} width={iw} height={ih} fill="transparent"
            onMouseMove={onMove} onTouchMove={onMove}
            onMouseLeave={() => setHover(null)} onTouchEnd={() => setHover(null)} />
        </svg>
      )}
      {hover != null && W > 0 && (
        <div className="absolute pointer-events-none z-10 rounded-lg px-3 py-2 text-xs whitespace-nowrap"
          style={{
            top: 8,
            left: X(hover) + (tipLeft ? -14 : 14),
            transform: tipLeft ? 'translateX(-100%)' : 'none',
            background: '#2a2932',
            border: '1px solid rgba(255,255,255,.12)',
            boxShadow: '0 8px 24px rgba(0,0,0,.35)',
          }}>
          <p className="font-semibold">{fmtLong(dates[hover])}</p>
          {shown.map((s) => (
            <p key={s.name} className="flex items-center gap-1.5 mt-1">
              <span className="inline-block w-2 h-2 rounded-sm" style={{ background: s.color }} />
              {s.name}: <strong>{Number.isInteger(s.values[hover]) ? fmtNum(s.values[hover]) : s.values[hover].toFixed(1)}</strong>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function Spark({ values, color }) {
  if (!values.length) return null;
  const w = 120, h = 26;
  const mx = Math.max(...values), mn = Math.min(...values);
  const pts = values
    .map((v, i) => `${(i / Math.max(1, values.length - 1)) * w},${h - 2 - ((v - mn) / (mx - mn || 1)) * (h - 4)}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="block w-full h-[26px] mt-2">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

function Delta({ cur, prev, vs = 'so với kỳ trước' }) {
  if (!prev) return <p className="text-xs text-on-surface-variant">{cur ? 'mới có dữ liệu' : '—'}</p>;
  const p = ((cur - prev) / prev) * 100;
  return (
    <p className="text-xs tabular-nums">
      <span style={{ color: p >= 0 ? UP : DOWN }}>{p >= 0 ? '▲' : '▼'} {Math.abs(p).toFixed(0)}%</span>{' '}
      <span className="text-on-surface-variant">{vs}</span>
    </p>
  );
}

// ---- Khối chính ---------------------------------------------------------------
export default function ActivityCharts() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);
  const [metric, setMetric] = useState('active');
  const [hidden, setHidden] = useState({});

  useEffect(() => {
    fetchActivityStats(180).then(({ data, error: err }) => {
      setStats(data);
      setError(err || '');
      setLoading(false);
    });
  }, []);

  const series = useMemo(() => {
    const days = stats?.days || [];
    return {
      dates: days.map((d) => parseDay(d.day)),
      active: days.map((d) => d.active || 0),
      new_users: days.map((d) => d.new_users || 0),
      views: days.map((d) => d.views || 0),
      hearts: days.map((d) => d.hearts || 0),
      entries: days.map((d) => d.entries || 0),
    };
  }, [stats]);

  const growth = useMemo(() => {
    const g = stats?.growth || {};
    return GROWTH.map((x) => {
      const base = g[x.key]?.base || 0;
      const adds = g[x.key]?.adds || [];
      let run = base;
      return { ...x, values: adds.map((a) => (run += a || 0)) };
    });
  }, [stats]);

  if (loading) {
    return (
      <section className="mb-12">
        <h2 className="h-md mb-2">Activity over time</h2>
        <p className="text-sm text-on-surface-variant">Đang tải số liệu hoạt động…</p>
      </section>
    );
  }
  if (error || !stats) {
    return (
      <section className="mb-12">
        <h2 className="h-md mb-2">Activity over time</h2>
        <p className="text-xs text-error">
          Chưa lấy được số liệu hoạt động (chạy migration_v55_activity_stats.sql trong Supabase). {error}
        </p>
      </section>
    );
  }

  const { dates, active, new_users, views, hearts, entries } = series;
  const periods = stats.periods || {};
  const today = active[active.length - 1] || 0;
  const yesterday = active[active.length - 2] || 0;
  const avg = sum(last(active, range)) / range;
  const avgPrev = sum(last(active, range, range)) / range;
  const wau = periods['7']?.cur || 0;
  const mau = periods['30']?.cur || 0;
  const stick = mau ? ((sum(last(active, 30)) / 30) / mau) * 100 : 0;
  const viewsCur = sum(last(views, range));
  const entriesCur = sum(last(entries, range));

  const kpis = [
    { l: 'Active hôm nay', v: fmtNum(today), d: <Delta cur={today} prev={yesterday} vs="so với hôm qua" />, s: last(active, 14), c: '#c6bfff' },
    { l: 'TB active / ngày', v: avg.toFixed(avg < 10 ? 1 : 0), d: <Delta cur={avg} prev={avgPrev} />, s: ma7(active).slice(-range), c: '#c6bfff' },
    { l: 'Weekly active (7 ngày)', v: fmtNum(wau), d: <Delta cur={wau} prev={periods['7']?.prev || 0} />, s: last(active, 28), c: '#c6bfff' },
    { l: 'Stickiness (DAU/MAU)', v: `${stick.toFixed(0)}%`, d: <p className="text-xs text-on-surface-variant">mức độ quay lại hằng ngày</p>, s: last(active, 30), c: AVG_COLOR },
    { l: 'Views trong kỳ', v: fmtNum(viewsCur), d: <Delta cur={viewsCur} prev={sum(last(views, range, range))} />, s: last(views, range), c: '#6fd6c4' },
    { l: 'Nội dung mới', v: fmtNum(entriesCur), d: <Delta cur={entriesCur} prev={sum(last(entries, range, range))} />, s: last(entries, range), c: '#7cb8ff' },
  ];

  const M = METRICS[metric];
  const mainVals = series[metric];
  const mainSeries = [
    { name: M.label, values: last(mainVals, range), color: M.color, type: 'bar' },
    { name: 'TB 7 ngày', values: ma7(mainVals).slice(-range), color: AVG_COLOR, width: 2.2 },
  ];

  const growthSeries = growth.map((g) => ({ name: g.label, values: last(g.values, range), color: g.color, on: !hidden[g.key] }));

  // Người mới / quay lại trong kỳ
  const periodActive = periods[String(range)]?.cur || 0;
  const newCount = Math.min(periodActive, sum(last(new_users, range)));
  const retCount = Math.max(0, periodActive - newCount);
  const newPct = periodActive ? Math.round((newCount / periodActive) * 100) : 0;

  // Thứ trong tuần (T2..CN)
  const wdAcc = Array(7).fill(0), wdCnt = Array(7).fill(0);
  last(dates, range).forEach((d, i) => { const k = (d.getDay() + 6) % 7; wdAcc[k] += last(active, range)[i]; wdCnt[k] += 1; });
  const wdAvg = wdAcc.map((a, i) => (wdCnt[i] ? a / wdCnt[i] : 0));
  const wdMax = Math.max(1, ...wdAvg);

  const hours = stats.hours || Array(24).fill(0);
  const hMax = Math.max(1, ...hours);

  const toggleGrowth = (key) => {
    const visible = GROWTH.filter((g) => !hidden[g.key]).length;
    if (!hidden[key] && visible === 1) return;
    setHidden((h) => ({ ...h, [key]: !h[key] }));
  };

  return (
    <section className="mb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="h-md">Activity over time</h2>
          <p className="text-xs text-on-surface-variant mt-1">Người dùng hoạt động và số liệu Dashboard theo từng ngày · chỉ admin thấy</p>
        </div>
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <button key={r.days} onClick={() => setRange(r.days)}
              className={range === r.days
                ? 'px-4 py-1.5 rounded-full text-xs bg-primary text-on-primary font-bold'
                : 'px-4 py-1.5 rounded-full text-xs border border-white/10 text-on-surface-variant hover:border-primary/50 transition-colors'}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {kpis.map((k) => (
          <div key={k.l} className="glass-card rounded-card p-5">
            <p className="label-sm text-on-surface-variant">{k.l}</p>
            <p className="text-3xl font-display font-semibold mt-2 mb-1 tabular-nums">{k.v}</p>
            {k.d}
            <Spark values={k.s} color={k.c} />
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Biểu đồ chính */}
        <div className="glass-card rounded-card p-6 lg:col-span-2 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="font-display text-base font-medium">{M.label}</h3>
              <p className="text-xs text-on-surface-variant mt-1">{M.sub}</p>
            </div>
            <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-white/5">
              {Object.entries(METRICS).map(([k, v]) => (
                <button key={k} onClick={() => setMetric(k)}
                  className={metric === k
                    ? 'px-3 py-1 rounded-lg text-xs bg-primary/20 text-on-surface font-semibold'
                    : 'px-3 py-1 rounded-lg text-xs text-on-surface-variant hover:text-on-surface'}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          <TimeChart dates={last(dates, range)} series={mainSeries} bars height={300} />
        </div>

        {/* Cột phải */}
        <div className="glass-card rounded-card p-6">
          <h3 className="font-display text-base font-medium">New vs returning</h3>
          <p className="text-xs text-on-surface-variant mt-1 mb-3">Người khác nhau trong {range} ngày: {fmtNum(periodActive)}</p>
          <div className="flex justify-between text-xs text-on-surface-variant mb-1"><span>Người mới</span><strong className="text-on-surface">{fmtNum(newCount)} · {newPct}%</strong></div>
          <div className="flex justify-between text-xs text-on-surface-variant mb-2"><span>Quay lại</span><strong className="text-on-surface">{fmtNum(retCount)} · {periodActive ? 100 - newPct : 0}%</strong></div>
          <div className="h-2.5 rounded-full bg-white/5 overflow-hidden flex">
            <div style={{ width: `${newPct}%`, background: AVG_COLOR }} />
            <div style={{ width: `${periodActive ? 100 - newPct : 0}%`, background: '#c6bfff' }} />
          </div>

          <h3 className="font-display text-base font-medium mt-6">Giờ hay vào</h3>
          <p className="text-xs text-on-surface-variant mt-1 mb-2">Đậm hơn = nhiều lượt truy cập hơn (từ trước đến nay)</p>
          <div className="grid gap-[3px]" style={{ display: 'grid', gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
            {hours.map((v, h) => (
              <div key={h} title={`${h}h: ${v} lượt`} className="rounded"
                style={{ aspectRatio: '1 / 1.6', background: `rgba(198,191,255,${0.07 + (0.88 * v) / hMax})` }} />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-on-surface-variant mt-1">
            <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
          </div>

          <h3 className="font-display text-base font-medium mt-6">Ngày đông nhất</h3>
          <p className="text-xs text-on-surface-variant mt-1 mb-2">Trung bình active users theo thứ</p>
          <div className="flex flex-col gap-1.5">
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((name, i) => (
              <div key={name} className="flex items-center gap-2.5 text-xs">
                <span className="w-6 text-on-surface-variant">{name}</span>
                <div className="flex-1 h-2.5 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(wdAvg[i] / wdMax) * 100}%`, background: wdAvg[i] === wdMax && wdMax > 0 ? AVG_COLOR : '#c6bfff' }} />
                </div>
                <span className="w-8 text-right tabular-nums">{wdAvg[i] < 10 ? wdAvg[i].toFixed(1) : Math.round(wdAvg[i])}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tăng trưởng kho kiến thức */}
      <div className="glass-card rounded-card p-6 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="font-display text-base font-medium">Knowledge base growth</h3>
            <p className="text-xs text-on-surface-variant mt-1">Tổng tích lũy của 6 thẻ số liệu. Bấm chú thích để ẩn/hiện.</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {growth.map((g) => {
              const v = last(g.values, range + 1);
              const plus = v.length ? v[v.length - 1] - v[0] : 0;
              return (
                <button key={g.key} onClick={() => toggleGrowth(g.key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border border-white/10 transition-opacity ${hidden[g.key] ? 'opacity-40' : ''}`}>
                  <span className="inline-block w-2.5 h-2.5 rounded" style={{ background: hidden[g.key] ? 'transparent' : g.color, outline: hidden[g.key] ? '1px solid #a9a4b8' : 'none' }} />
                  {g.label}
                  <span className="tabular-nums" style={{ color: UP }}>{fmtNum(v[v.length - 1] || 0)} · +{plus}</span>
                </button>
              );
            })}
          </div>
        </div>
        <TimeChart dates={last(dates, range)} series={growthSeries} height={280} />
      </div>
    </section>
  );
}
