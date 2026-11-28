-- =====================================================================
-- v70 · Creative City — Ảnh Lạ: admin chọn SỐ CÂU mỗi lượt và SỐ GIÂY mỗi câu.
--   cc_rooms.quiz_count (mặc định 10), quiz_seconds mặc định 5 (cho phép 3–120 giây).
-- Chạy 1 lần trong Supabase → SQL Editor. Chạy lại cũng không sao.
-- =====================================================================
alter table public.cc_rooms add column if not exists quiz_count integer not null default 10;
alter table public.cc_rooms drop constraint if exists cc_rooms_quiz_count_check;
alter table public.cc_rooms add constraint cc_rooms_quiz_count_check check (quiz_count between 1 and 100);
alter table public.cc_rooms drop constraint if exists cc_rooms_quiz_seconds_check;
alter table public.cc_rooms add constraint cc_rooms_quiz_seconds_check check (quiz_seconds between 3 and 120);
alter table public.cc_rooms alter column quiz_seconds set default 5;

create or replace function public.cc_state(p_room text, p_token uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r public.cc_rooms := public.cc_room_row(p_room);
  p public.cc_players;
  q public.cc_questions;
  v_total integer; v_quiz jsonb; v_reveal boolean; v_me jsonb := null;
begin
  if p_token is not null then
    select * into p from public.cc_players where token = p_token and room = r.code;
    if p.id is not null and p.last_seen < now() - interval '15 seconds' then
      update public.cc_players set last_seen = now() where id = p.id;
    end if;
  end if;

  select least(count(*), r.quiz_count) into v_total from public.cc_questions where active;
  q := public.cc_question_at(r.quiz_index);
  v_reveal := r.quiz_phase in ('reveal', 'board');
  if q.id is not null then
    v_quiz := jsonb_build_object(
      'index', r.quiz_index, 'total', v_total, 'phase', r.quiz_phase,
      'started_at', r.quiz_started_at, 'seconds', r.quiz_seconds,
      'answered', (select count(*) from public.cc_answers a where a.room = r.code and a.q_index = r.quiz_index),
      'question', case when r.quiz_phase <> 'idle' then q.question end,
      'opts',     case when r.quiz_phase <> 'idle' then to_jsonb(q.opts) end,
      'image_path', case when r.quiz_phase <> 'idle' then q.image_path end,
      'builtin',  case when r.quiz_phase <> 'idle' then q.builtin end,
      'ok',       case when v_reveal then q.ok end,
      'dist',     case when v_reveal then (
                     select jsonb_agg((select count(*) from public.cc_answers a
                                        where a.room = r.code and a.q_index = r.quiz_index and a.choice = g.i) order by g.i)
                       from generate_series(0, 3) as g(i)) end,
      'mine',     case when p.id is not null then (
                     select jsonb_build_object('choice', a.choice,
                                               'correct', case when v_reveal then a.correct end,
                                               'points',  case when v_reveal then a.points end)
                       from public.cc_answers a where a.room = r.code and a.q_index = r.quiz_index and a.player_id = p.id) end
    );
  end if;

  if p.id is not null then
    v_me := jsonb_build_object('name', p.name, 'color', p.color, 'score', p.score, 'brand', p.brand,
      'brand_item', (select b.item from public.cc_brands b where b.name = p.brand),
      'rank', 1 + (select count(*) from public.cc_players x where x.room = r.code and x.score > p.score),
      'words_left', greatest(0, 3 - p.words_sent), 'arts_left', greatest(0, 3 - p.arts_sent));
  end if;

  return jsonb_build_object(
    'now', now(), 'room', r.code, 'title', r.title, 'station', r.station, 'zone', r.zone,
    'menti_code', r.menti_code,
    'players', (select count(*) from public.cc_players x where x.room = r.code),
    'quiz', v_quiz, 'me', v_me,
    'draw', jsonb_build_object('started_at', r.draw_started_at, 'minutes', r.draw_minutes),
    'top', (select coalesce(jsonb_agg(jsonb_build_object('name', t.name, 'color', t.color, 'score', t.score) order by t.score desc, t.joined_at), '[]'::jsonb)
              from (select * from public.cc_players x where x.room = r.code order by x.score desc, x.joined_at limit 5) t),
    'words', (select coalesce(jsonb_agg(jsonb_build_object('w', w.word, 'n', w.n) order by w.n desc, w.word), '[]'::jsonb)
                from (select * from public.cc_words x where x.room = r.code order by x.n desc limit 40) w)
  );
end $$;
grant execute on function public.cc_state(text, uuid) to anon, authenticated;
