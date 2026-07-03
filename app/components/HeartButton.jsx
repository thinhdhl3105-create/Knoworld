'use client';

import { useEffect, useState } from 'react';
import { toggleHeart } from '@/lib/hearts';

// Nút thả tim dùng chung cho video / student case study / discussion.
// data: { count, hearted } — nạp sẵn từ fetchHeartMap của trang cha.
// Tự cập nhật lạc quan (optimistic) rồi đồng bộ với kết quả server.
export default function HeartButton({ type, id, data, size = 'md', className = '' }) {
  const [state, setState] = useState(data || { count: 0, hearted: false });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) setState(data);
  }, [data]);

  const onClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    // Optimistic update
    setState((s) => ({ count: Math.max(0, s.count + (s.hearted ? -1 : 1)), hearted: !s.hearted }));
    const res = await toggleHeart(type, id);
    if (res) setState(res);
    setBusy(false);
  };

  const sizes = {
    sm: { icon: 'text-base', text: 'text-xs', pad: 'px-2 py-1' },
    md: { icon: 'text-xl', text: 'text-sm', pad: 'px-3 py-1.5' },
  };
  const s = sizes[size] || sizes.md;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={state.hearted ? 'Remove heart' : 'Give a heart'}
      title={state.hearted ? 'Bỏ tim' : 'Thả tim'}
      className={`inline-flex items-center gap-1.5 rounded-full ${s.pad} transition-colors ${
        state.hearted
          ? 'text-[#ff5c8a] bg-[#ff5c8a]/10 border border-[#ff5c8a]/40'
          : 'text-on-surface-variant border border-white/10 hover:text-[#ff5c8a] hover:border-[#ff5c8a]/40'
      } ${className}`}
    >
      <span
        className={`material-symbols-outlined ${s.icon} ${state.hearted ? 'heart-filled' : ''}`}
        style={state.hearted ? { fontVariationSettings: "'FILL' 1" } : undefined}
      >
        favorite
      </span>
      <span className={`${s.text} font-bold tabular-nums`}>{state.count}</span>
    </button>
  );
}
