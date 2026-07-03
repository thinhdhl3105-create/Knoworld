'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../components/AuthProvider';
import HeartButton from '../components/HeartButton';
import { fetchHeartMap } from '@/lib/hearts';
import {
  fetchQuestions,
  fetchAnswers,
  postQuestion,
  postAnswer,
  deleteQuestion,
  deleteAnswer,
  getDisplayName,
  isMine,
  timeAgo,
} from '@/lib/discussion';

const ADMIN_EMAIL = 'thinh.dhl3105@gmail.com';

// Tên hiển thị của một bài đăng.
function authorLabel(row) {
  return row.is_anonymous || !row.author_name ? 'Anonymous' : row.author_name;
}

// Avatar chữ cái đầu.
function Avatar({ row }) {
  const anon = row.is_anonymous || !row.author_name;
  const letter = anon ? '?' : row.author_name.trim()[0]?.toUpperCase() || '?';
  return (
    <span
      className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${
        anon ? 'bg-white/10 text-on-surface-variant' : 'bg-primary/20 text-primary'
      }`}
    >
      {letter}
    </span>
  );
}

// Chọn đăng bằng tên mình hay ẩn danh.
function IdentityToggle({ anonymous, setAnonymous, displayName }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-on-surface-variant">Post as:</span>
      <button
        type="button"
        onClick={() => setAnonymous(false)}
        disabled={!displayName}
        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
          !anonymous && displayName
            ? 'bg-primary text-on-primary'
            : 'border border-white/10 text-on-surface-variant hover:border-primary/50 disabled:opacity-40 disabled:cursor-not-allowed'
        }`}
        title={displayName ? undefined : 'Sign in or register at the gate to post with your name'}
      >
        {displayName || 'Your name'}
      </button>
      <button
        type="button"
        onClick={() => setAnonymous(true)}
        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
          anonymous
            ? 'bg-secondary/80 text-background'
            : 'border border-white/10 text-on-surface-variant hover:border-secondary/50'
        }`}
      >
        Anonymous
      </button>
    </div>
  );
}

export default function DiscussionPage() {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const displayName = getDisplayName(user);

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qHearts, setQHearts] = useState({});
  const [sort, setSort] = useState('new'); // 'new' | 'top'

  // Form đặt câu hỏi
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [anonymous, setAnonymous] = useState(!displayName);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    fetchQuestions().then(({ data }) => {
      setQuestions(data);
      setLoading(false);
      fetchHeartMap('question', data.map((q) => q.id)).then(setQHearts);
    });
  };

  useEffect(load, []);
  useEffect(() => {
    if (!displayName) setAnonymous(true);
  }, [displayName]);

  const sorted = useMemo(() => {
    const arr = [...questions];
    if (sort === 'top') {
      arr.sort((a, b) => (qHearts[b.id]?.count || 0) - (qHearts[a.id]?.count || 0));
    }
    return arr;
  }, [questions, sort, qHearts]);

  const submit = async (e) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError('');
    const res = await postQuestion({ title, body, anonymous, user });
    setSending(false);
    if (!res.ok) {
      setError(res.error || 'Could not post your question.');
      return;
    }
    setTitle('');
    setBody('');
    setShowForm(false);
    load();
  };

  return (
    <div className="pt-32 pb-24 max-w-4xl mx-auto px-5 md:px-8">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="h-px w-12 bg-primary" />
          <span className="label-sm text-secondary tracking-widest">Community</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="h-xl mb-4">Discussion</h1>
            <p className="text-lg text-on-surface-variant max-w-2xl leading-relaxed">
              Ask anything about IMC, branding, strategy or the case studies — and help others by
              answering. Post with your name or stay anonymous.
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-lg text-sm font-bold hover:scale-95 transition-transform whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-base">{showForm ? 'close' : 'help'}</span>
            {showForm ? 'Cancel' : 'Ask a Question'}
          </button>
        </div>
      </header>

      {/* Form đặt câu hỏi */}
      {showForm && (
        <form onSubmit={submit} className="glass-card rounded-card p-6 mb-10 flex flex-col gap-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Your question (e.g. How do I find a real insight for a Gen Z campaign?)"
            maxLength={200}
            className="bg-surface-container-lowest border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add more context (optional)…"
            rows={4}
            maxLength={3000}
            className="bg-surface-container-lowest border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40 resize-y"
          />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <IdentityToggle anonymous={anonymous} setAnonymous={setAnonymous} displayName={displayName} />
            <button
              type="submit"
              disabled={sending || !title.trim()}
              className="bg-primary text-on-primary px-6 py-2.5 rounded-lg text-sm font-bold hover:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sending ? 'Posting…' : 'Post Question'}
            </button>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
      )}

      {/* Sắp xếp */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { k: 'new', label: 'Newest' },
          { k: 'top', label: 'Most hearted' },
        ].map((s) => (
          <button
            key={s.k}
            onClick={() => setSort(s.k)}
            className={
              sort === s.k
                ? 'px-4 py-1.5 rounded-full text-sm bg-primary text-on-primary font-bold'
                : 'px-4 py-1.5 rounded-full text-sm border border-white/10 text-on-surface-variant hover:border-primary/50 transition-colors'
            }
          >
            {s.label}
          </button>
        ))}
        <span className="ml-auto label-sm text-on-surface-variant">
          {questions.length} question{questions.length === 1 ? '' : 's'}
        </span>
      </div>

      {loading ? (
        <p className="text-on-surface-variant">Loading…</p>
      ) : sorted.length === 0 ? (
        <p className="text-on-surface-variant glass-card rounded-card p-8 text-center">
          No questions yet — be the first to ask!
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {sorted.map((q) => (
            <QuestionCard
              key={q.id}
              q={q}
              heart={qHearts[q.id]}
              user={user}
              isAdmin={isAdmin}
              displayName={displayName}
              onDeleted={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionCard({ q, heart, user, isAdmin, displayName, onDeleted }) {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState(null); // null = chưa tải
  const [aHearts, setAHearts] = useState({});
  const [answerCount, setAnswerCount] = useState(q.answer_count || 0);

  const [body, setBody] = useState('');
  const [anonymous, setAnonymous] = useState(!displayName);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const canDelete = isAdmin || isMine(q);

  const loadAnswers = () => {
    fetchAnswers(q.id).then(({ data }) => {
      setAnswers(data);
      setAnswerCount(data.length);
      fetchHeartMap('answer', data.map((a) => a.id)).then(setAHearts);
    });
  };

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next && answers === null) loadAnswers();
  };

  const submitAnswer = async (e) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError('');
    const res = await postAnswer({ questionId: q.id, body, anonymous, user });
    setSending(false);
    if (!res.ok) {
      setError(res.error || 'Could not post your answer.');
      return;
    }
    setBody('');
    loadAnswers();
  };

  const removeQuestion = async () => {
    if (!window.confirm('Delete this question (and all its answers)?')) return;
    const res = await deleteQuestion(q.id, { isAdmin });
    if (res.ok) onDeleted();
  };

  const removeAnswer = async (a) => {
    if (!window.confirm('Delete this answer?')) return;
    const res = await deleteAnswer(a.id, { isAdmin });
    if (res.ok) loadAnswers();
  };

  return (
    <article className="glass-card rounded-card p-6">
      <div className="flex items-start gap-4">
        <Avatar row={q} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap text-xs text-on-surface-variant mb-1">
            <span className={q.is_anonymous || !q.author_name ? 'italic' : 'font-bold text-on-surface'}>
              {authorLabel(q)}
            </span>
            <span>·</span>
            <span>{timeAgo(q.created_at)}</span>
            {canDelete && (
              <button
                onClick={removeQuestion}
                className="ml-auto inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-red-400 transition-colors"
                title="Delete"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
            )}
          </div>
          <h2 className="font-display text-lg font-medium leading-snug mb-1">{q.title}</h2>
          {q.body && <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">{q.body}</p>}

          <div className="flex items-center gap-3 mt-4">
            <HeartButton type="question" id={q.id} data={heart} size="sm" />
            <button
              onClick={toggleOpen}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border border-white/10 text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors"
            >
              <span className="material-symbols-outlined text-base">forum</span>
              {answerCount} answer{answerCount === 1 ? '' : 's'}
              <span className="material-symbols-outlined text-base">{open ? 'expand_less' : 'expand_more'}</span>
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="mt-5 pl-4 md:pl-13 border-l border-white/10 ml-4 flex flex-col gap-4">
          {answers === null ? (
            <p className="text-sm text-on-surface-variant">Loading answers…</p>
          ) : answers.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No answers yet — share what you know!</p>
          ) : (
            answers.map((a) => (
              <div key={a.id} className="flex items-start gap-3">
                <Avatar row={a} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap text-xs text-on-surface-variant">
                    <span className={a.is_anonymous || !a.author_name ? 'italic' : 'font-bold text-on-surface'}>
                      {authorLabel(a)}
                    </span>
                    <span>·</span>
                    <span>{timeAgo(a.created_at)}</span>
                    {(isAdmin || isMine(a)) && (
                      <button
                        onClick={() => removeAnswer(a)}
                        className="ml-auto text-on-surface-variant hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap mt-1">{a.body}</p>
                  <div className="mt-2">
                    <HeartButton type="answer" id={a.id} data={aHearts[a.id]} size="sm" />
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Form trả lời */}
          <form onSubmit={submitAnswer} className="flex flex-col gap-3 mt-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your answer…"
              rows={3}
              maxLength={3000}
              className="bg-surface-container-lowest border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40 resize-y"
            />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <IdentityToggle anonymous={anonymous} setAnonymous={setAnonymous} displayName={displayName} />
              <button
                type="submit"
                disabled={sending || !body.trim()}
                className="bg-primary text-on-primary px-5 py-2 rounded-lg text-sm font-bold hover:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sending ? 'Posting…' : 'Post Answer'}
              </button>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </form>
        </div>
      )}
    </article>
  );
}
