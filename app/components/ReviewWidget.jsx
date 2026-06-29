'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  shouldPromptReview,
  hasReviewed,
  snoozeReview,
  submitReview,
} from '@/lib/reviews';

const RATING_LABELS = ['', 'Không tốt', 'Tạm', 'Bình thường', 'Tốt', 'Rất tốt'];

const CRITERIA = [
  { key: 'convenience', label: 'Sự tiện lợi' },
  { key: 'content', label: 'Nội dung' },
  { key: 'overall', label: 'Tổng quan' },
];

function StarRow({ label, value, onChange }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-on-surface">{label}</span>
      <div className="flex items-center gap-1.5">
        <div className="flex" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              onMouseEnter={() => setHover(n)}
              className="material-symbols-outlined text-2xl leading-none transition-transform hover:scale-110"
              style={{
                color: n <= shown ? '#f6bd56' : 'rgba(200,196,215,0.35)',
                fontVariationSettings: n <= shown ? "'FILL' 1" : "'FILL' 0",
              }}
              aria-label={`${label} ${n} sao`}
            >
              star
            </button>
          ))}
        </div>
        <span className="w-20 text-right text-xs text-on-surface-variant">
          {shown ? RATING_LABELS[shown] : ''}
        </span>
      </div>
    </div>
  );
}

export default function ReviewWidget() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [vals, setVals] = useState({ convenience: 0, content: 0, overall: 0 });
  const [comment, setComment] = useState('');
  const [thankYou, setThankYou] = useState(false);

  // Mở form (từ toast hoặc nút nổi).
  const openForm = useCallback(() => {
    setToast(false);
    setOpen(true);
  }, []);

  useEffect(() => {
    setMounted(true);
    if (hasReviewed()) {
      setDone(true);
      return;
    }
    // Lần vào lại: nếu đã đủ điều kiện thì mời luôn.
    if (shouldPromptReview()) setToast(true);

    // Mỗi lần xem thêm nội dung → kiểm tra lại.
    const onView = () => {
      if (!hasReviewed() && shouldPromptReview()) setToast(true);
    };
    window.addEventListener('kw-content-view', onView);
    return () => window.removeEventListener('kw-content-view', onView);
  }, []);

  // Lời cảm ơn ngắn sau khi gửi (đặt trước mọi early-return để giữ thứ tự hook).
  useEffect(() => {
    if (!thankYou) return;
    const t = setTimeout(() => setThankYou(false), 4000);
    return () => clearTimeout(t);
  }, [thankYou]);

  if (!mounted) return null;

  const setRating = (key, n) => setVals((v) => ({ ...v, [key]: n }));
  const canSubmit =
    vals.convenience > 0 && vals.content > 0 && vals.overall > 0 && !submitting;

  const dismissToast = () => {
    setToast(false);
    snoozeReview();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    const res = await submitReview({
      convenience: vals.convenience,
      content: vals.content,
      overall: vals.overall,
      comment,
    });
    setSubmitting(false);
    if (!res.ok) {
      setError('Gửi đánh giá chưa được, vui lòng thử lại.');
      return;
    }
    setDone(true);
    setOpen(false);
    setThankYou(true);
  };

  return (
    <>
      {/* Nút nổi luôn hiện (trừ khi đang mở form) */}
      {!open && (
        <button
          onClick={openForm}
          className="fixed bottom-5 right-5 z-[55] flex items-center gap-2 bg-primary text-on-primary px-4 py-3 rounded-full shadow-lg shadow-black/40 text-sm font-bold hover:scale-95 transition-transform"
          aria-label="Đánh giá website"
        >
          <span className="material-symbols-outlined text-xl">rate_review</span>
          <span className="hidden sm:inline">{done ? 'Đánh giá lại' : 'Đánh giá'}</span>
        </button>
      )}

      {/* Toast mời đánh giá (không chặn màn hình) */}
      {toast && !open && (
        <div className="fixed bottom-20 right-5 z-[55] w-72 glass-card rounded-card p-4 shadow-xl shadow-black/40 animate-[kwSlideUp_.3s_ease]">
          <button
            onClick={dismissToast}
            className="absolute top-2 right-2 material-symbols-outlined text-on-surface-variant hover:text-primary text-lg"
            aria-label="Đóng"
          >
            close
          </button>
          <p className="text-sm font-bold text-on-surface mb-1">Bạn thấy trang thế nào?</p>
          <p className="text-xs text-on-surface-variant mb-3">
            Dành 15 giây đánh giá để giúp chúng tôi cải thiện nhé.
          </p>
          <button
            onClick={openForm}
            className="w-full bg-primary text-on-primary py-2 rounded-lg text-sm font-bold hover:scale-[0.98] transition-transform"
          >
            Đánh giá ngay
          </button>
        </div>
      )}

      {/* Lời cảm ơn sau khi gửi */}
      {thankYou && (
        <div className="fixed bottom-20 right-5 z-[55] w-72 glass-card rounded-card p-4 shadow-xl shadow-black/40 animate-[kwSlideUp_.3s_ease]">
          <p className="text-sm font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">favorite</span>
            Cảm ơn bạn đã đánh giá!
          </p>
        </div>
      )}

      {/* Modal form đầy đủ */}
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md glass-card rounded-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-1">
              <h2 className="font-display text-lg font-medium">Đánh giá trải nghiệm</h2>
              <button
                onClick={() => setOpen(false)}
                className="material-symbols-outlined text-on-surface-variant hover:text-primary"
                aria-label="Đóng"
              >
                close
              </button>
            </div>
            <p className="text-xs text-on-surface-variant mb-4">
              Chấm điểm từ 1 (Không tốt) đến 5 (Rất tốt).
            </p>

            <div className="divide-y divide-white/5 mb-4">
              {CRITERIA.map((c) => (
                <StarRow
                  key={c.key}
                  label={c.label}
                  value={vals[c.key]}
                  onChange={(n) => setRating(c.key, n)}
                />
              ))}
            </div>

            <label className="block text-sm text-on-surface mb-1.5">
              Đóng góp ý kiến thêm
              <span className="text-on-surface-variant"> (tùy chọn)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Bạn muốn chúng tôi cải thiện điều gì?"
              className="w-full bg-surface-container-low border border-white/10 rounded-lg p-3 text-sm text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:border-primary/50 transition-colors resize-none"
            />

            {error && <p className="text-error text-xs mt-2">{error}</p>}

            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold border border-white/10 text-on-surface-variant hover:border-primary/40 transition-colors"
              >
                Để sau
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-primary text-on-primary hover:scale-[0.98] transition-transform disabled:opacity-40 disabled:hover:scale-100"
              >
                {submitting ? 'Đang gửi…' : 'Gửi đánh giá'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes kwSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
