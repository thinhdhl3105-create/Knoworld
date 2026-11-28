-- =====================================================================
-- v68 · Creative City
--   1) SỬA LỖI: bấm "Bắt đầu" ở câu 2 lại quay về câu 1
--      (greatest(NULL, 0) = 0 trong Postgres -> quiz_index bị đặt về 0).
--   2) Lớp theo KHU: cc_rooms.zone ('guess' | 'draw' | 'wall' | 'plaza' | null = cả thành phố).
--      Quét QR của lớp nào thì điện thoại chỉ vào đúng khu đó.
--   3) Mặc định 10 giây mỗi câu Ảnh Lạ.
-- Chạy 1 lần trong Supabase → SQL Editor. Chạy lại cũng không sao.
-- =====================================================================

alter table public.cc_rooms add column if not exists zone text;
alter table public.cc_rooms drop constraint if exists cc_rooms_zone_check;
alter table public.cc_rooms add constraint cc_rooms_zone_check check (zone is null or zone in ('guess', 'draw', 'wall', 'plaza'));
alter table public.cc_rooms alter column quiz_seconds set default 10;

create or replace function public.cc_admin_quiz(p_room text, p_phase text, p_index integer default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.cc_is_admin() then raise exception 'not admin'; end if;
  if p_phase not in ('idle', 'run', 'reveal', 'board') then raise exception 'bad phase'; end if;
  update public.cc_rooms
     set quiz_phase = p_phase,
         quiz_index = case when p_index is null then quiz_index else greatest(p_index, 0) end,
         quiz_started_at = case when p_phase = 'run' then now() else quiz_started_at end,
         station = 'guess'
   where code = p_room;
end $$;
grant execute on function public.cc_admin_quiz(text, text, integer) to authenticated;

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

  select count(*) into v_total from public.cc_questions where active;
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
