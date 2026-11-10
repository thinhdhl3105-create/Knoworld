'use client';

// v33: Nhân vật cư dân — hình nhân vật, bộ tạo nhân vật, và bảng nhắc người cũ tạo nhân vật.
import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_AVATAR, GENDERS, HAIRSTYLES, HAIR, SKIN, EXPR, OUTFITS,
  renderAvatarSvg, randomAvatar, outfitName, saveAvatar, VIEW_FULL,
} from '@/lib/citizenAvatar';
import './avatar.css';

export function AvatarFigure({ avatar, viewBox = VIEW_FULL, className = '' }) {
  const html = useMemo(() => renderAvatarSvg(avatar || DEFAULT_AVATAR, viewBox), [avatar, viewBox]);
  return <span className={`kwa-figure ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

function Chips({ items, value, onPick, label }) {
  return (
    <div className="kwa-chips" role="radiogroup" aria-label={label}>
      {items.map(([v, l]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} className="kwa-chip" onClick={() => onPick(v)}>{l}</button>
      ))}
    </div>
  );
}

function Swatches({ items, value, onPick, label }) {
  return (
    <div className="kwa-swatches" role="radiogroup" aria-label={label}>
      {items.map(([l, c]) => (
        <button key={c} type="button" role="radio" aria-checked={value === c} aria-label={l} title={l}
          className="kwa-sw" style={{ background: c }} onClick={() => onPick(c)} />
      ))}
    </div>
  );
}

// Bộ tạo nhân vật (controlled). showStage = hiện nhân vật lớn ở trên.
export function AvatarCreator({ value, onChange, showStage = true }) {
  const a = value || DEFAULT_AVATAR;
  const [tab, setTab] = useState(() => (OUTFITS.find((o) => o.id === a.outfit)?.kind || 'kigu'));
  const set = (patch) => onChange({ ...a, ...patch });
  const isKigu = OUTFITS.find((o) => o.id === a.outfit)?.kind === 'kigu';

  return (
    <div className="kwa">
      <div className="kwa-head">
        <div>
          <h3>Your citizen</h3>
          <p>Nhân vật này sẽ hiện trên thẻ cư dân của bạn.</p>
        </div>
        <button type="button" className="kwa-btn" onClick={() => { const r = randomAvatar(); setTab(OUTFITS.find((o) => o.id === r.outfit).kind); onChange(r); }}>
          <span className="material-symbols-outlined" aria-hidden="true">shuffle</span>Ngẫu nhiên
        </button>
      </div>

      {showStage && (
        <div className="kwa-stage">
          <AvatarFigure avatar={a} className="kwa-big" />
          <span className="kwa-name">{outfitName(a.outfit)}</span>
        </div>
      )}

      <div className="kwa-rows">
        <div className="kwa-row"><span className="kwa-label">Giới tính</span>
          <Chips label="Giới tính" items={GENDERS} value={a.gender} onPick={(g) => set({ gender: g, hairstyle: HAIRSTYLES[g][0][0] })} />
        </div>
        <div className="kwa-row"><span className="kwa-label">Kiểu tóc</span>
          <Chips label="Kiểu tóc" items={HAIRSTYLES[a.gender]} value={a.hairstyle} onPick={(h) => set({ hairstyle: h })} />
          {isKigu && <p className="kwa-hint">Đang mặc đồ trùm đầu nên chỉ thấy phần mái.</p>}
        </div>
        <div className="kwa-row"><span className="kwa-label">Màu tóc</span>
          <Swatches label="Màu tóc" items={HAIR} value={a.hair} onPick={(c) => set({ hair: c })} />
        </div>
        <div className="kwa-row"><span className="kwa-label">Màu da</span>
          <Swatches label="Màu da" items={SKIN} value={a.skin} onPick={(c) => set({ skin: c })} />
        </div>
        <div className="kwa-row"><span className="kwa-label">Biểu cảm</span>
          <Chips label="Biểu cảm" items={EXPR} value={a.expr} onPick={(x) => set({ expr: x })} />
        </div>
        <div className="kwa-row"><span className="kwa-label">Bộ đồ</span>
          <div className="kwa-tabs" role="tablist">
            {[['kigu', 'Thú bông'], ['wear', 'Thường ngày']].map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} className="kwa-tab" onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>
          <div className="kwa-grid">
            {OUTFITS.filter((o) => o.kind === tab).map((o) => (
              <button key={o.id} type="button" className="kwa-tile" aria-pressed={a.outfit === o.id} onClick={() => set({ outfit: o.id })}>
                <AvatarFigure avatar={{ ...a, outfit: o.id }} />
                <span>{o.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Bảng bắt buộc cho người đã đăng ký từ trước nhưng chưa có nhân vật.
export function AvatarPrompt({ name, onDone }) {
  const [avatar, setAvatar] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setAvatar(randomAvatar()); }, []);
  if (!avatar) return null;

  async function save() {
    setBusy(true);
    await saveAvatar(avatar);
    setBusy(false);
    onDone(avatar);
  }

  return (
    <div className="kwg" role="dialog" aria-modal="true" aria-label="Create your citizen">
      <div className="kwg-card kwa-prompt">
        <span className="kwg-kicker">Knoworld City · Civil Registry Office</span>
        <h1 className="kwg-h1">{name ? `Welcome back, ${name}!` : 'Welcome back, citizen!'}</h1>
        <p className="kwg-sub">Thành phố vừa có thẻ cư dân hình nhân vật. Tạo nhân vật của bạn để tiếp tục vào thành phố nhé.</p>
        <AvatarCreator value={avatar} onChange={setAvatar} />
        <button type="button" className="kwg-submit" style={{ '--c': '#c6bfff' }} disabled={busy} onClick={save}>
          {busy ? 'Saving…' : 'Save my citizen'}
          {!busy && <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>}
        </button>
      </div>
    </div>
  );
}
