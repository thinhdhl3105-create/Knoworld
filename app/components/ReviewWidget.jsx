'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  shouldPromptReview,
  hasReviewed,
  snoozeReview,
  submitReview,
} from '@/lib/reviews';
import { getServerVisitCount, MANDATORY_REVIEW_VISIT } from '@/lib/visitor';

const RATING_LABELS = ['', 'Poor', 'Fair', 'Average', 'Good', 'Excellent'];

const CRITERIA = [
  { key: 'convenience', label: 'Convenience' },
  { key: 'content', label: 'Content' },
  { key: 'overall', label: 'Overall' },
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
              aria-label={`${label} ${n} stars`}
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
  const [mandatory, setMandatory] = useState(false); // ép đánh giá (không tắt được)

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

    // Ép đánh giá khi đã truy cập đủ số lần quy định (chặn cứng).
    const forceReview = () => {
      setMandatory(true);
      setToast(false);
      setOpen(true);
    };
    if (getServerVisitCount() >= MANDATORY_REVIEW_VISIT) forceReview();
    window.addEventListener('kw-force-review', forceReview);

    // Lần vào lại: nếu đã đủ điều kiện thì mời luôn.
    if (shouldPromptReview()) setToast(true);

    // Mỗi lần xem thêm nội dung → kiểm tra lại.
    const onView = () => {
      if (!hasReviewed() && shouldPromptReview()) setToast(true);
    };
    window.addEventListener('kw-content-view', onView);
    return () => {
      window.removeEventListener('kw-content-view', onView);
      window.removeEventListener('kw-force-review', forceReview);
    };
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
      setError("Couldn't submit your review. Please try again.");
      return;
    }
    setDone(true);
    setMandatory(false);
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
          aria-label="Rate this website"
        >
          <span className="material-symbols-outlined text-xl">rate_review</span>
          <span className="hidden sm:inline">{done ? 'Rate again' : 'Rate us'}</span>
        </button>
      )}

      {/* Toast mời đánh giá (không chặn màn hình) */}
      {toast && !open && (
        <div className="fixed bottom-20 right-5 z-[55] w-72 glass-card rounded-card p-4 shadow-xl shadow-black/40 animate-[kwSlideUp_.3s_ease]">
          <button
            onClick={dismissToast}
            className="absolute top-2 right-2 material-symbols-outlined text-on-surface-variant hover:text-primary text-lg"
            aria-label="Close"
          >
            close
          </button>
          <p className="text-sm font-bold text-on-surface mb-1">How's your experience?</p>
          <p className="text-xs text-on-surface-variant mb-3">
            Take 15 seconds to rate us and help us improve.
          </p>
          <button
            onClick={openForm}
            className="w-full bg-primary text-on-primary py-2 rounded-lg text-sm font-bold hover:scale-[0.98] transition-transform"
          >
            Rate now
          </button>
        </div>
      )}

      {/* Lời cảm ơn sau khi gửi */}
      {thankYou && (
        <div className="fixed bottom-20 right-5 z-[55] w-72 glass-card rounded-card p-4 shadow-xl shadow-black/40 animate-[kwSlideUp_.3s_ease]">
          <p className="text-sm font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">favorite</span>
            Thanks for your feedback!
          </p>
        </div>
      )}

      {/* Modal form đầy đủ */}
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => { if (!mandatory) setOpen(false); }}
        >
          <div
            className="w-full max-w-md glass-card rounded-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-1">
              <h2 className="font-display text-lg font-medium">Rate your experience</h2>
              {!mandatory && (
                <button
                  onClick={() => setOpen(false)}
                  className="material-symbols-outlined text-on-surface-variant hover:text-primary"
                  aria-label="Close"
                >
                  close
                </button>
              )}
            </div>
            <p className="text-xs text-on-surface-variant mb-4">
              {mandatory
                ? 'You have visited a few times — please rate us to keep exploring.'
                : 'Rate from 1 (Poor) to 5 (Excellent).'}
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
              Additional feedback
              <span className="text-on-surface-variant"> (optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="What would you like us to improve?"
              className="w-full bg-surface-container-low border border-white/10 rounded-lg p-3 text-sm text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:border-primary/50 transition-colors resize-none"
            />

            {error && <p className="text-error text-xs mt-2">{error}</p>}

            <div className="flex items-center gap-3 mt-4">
              {!mandatory && (
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-bold border border-white/10 text-on-surface-variant hover:border-primary/40 transition-colors"
                >
                  Later
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-primary text-on-primary hover:scale-[0.98] transition-transform disabled:opacity-40 disabled:hover:scale-100"
              >
                {submitting ? 'Submitting…' : 'Submit'}
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
