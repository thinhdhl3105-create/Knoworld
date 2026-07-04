'use client';

// v18 — Thông báo cho Guest (stranger): chỉ xem được các case được chọn.
export default function GuestLimitBanner({ count }) {
  return (
    <div className="glass-card rounded-card p-4 mb-8 flex items-start gap-3 border border-primary/30">
      <span className="material-symbols-outlined text-primary mt-0.5">lock</span>
      <div>
        <p className="text-sm font-medium">Guest preview</p>
        <p className="text-xs text-on-surface-variant mt-0.5">
          You can view {count} selected case stud{count === 1 ? 'y' : 'ies'}. Students on the
          class list get full access — or the lecturer can enable full access for your account.
        </p>
      </div>
    </div>
  );
}
