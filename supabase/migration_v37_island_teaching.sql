-- ============================================================================
-- migration_v37_island_teaching.sql
-- THINH'S ISLAND — lịch dạy nâng cấp:
--   * school        : trường dạy (HSU, VLU, UEH…)
--   * status        : 'active' | 'cancelled' (cho nghỉ) | 'makeup' (buổi dạy bù)
--   * cancel_reason : lý do nghỉ (tuỳ chọn)
--   * makeup_for    : buổi dạy bù này bù cho buổi nào
-- Lặp theo thứ (vd T2 + T4 từ ngày A đến ngày B) dùng series_id sẵn có, không cần cột mới.
--
-- Chạy trong: Supabase Dashboard > SQL Editor > New query. Chạy lại nhiều lần vẫn an toàn.
-- Quyền (RLS chỉ admin) giữ nguyên từ migration_v30_island.sql.
-- ============================================================================

alter table public.private_events add column if not exists school text;
alter table public.private_events add column if not exists status text not null default 'active';
alter table public.private_events add column if not exists cancel_reason text;
alter table public.private_events add column if not exists makeup_for uuid;

alter table public.private_events drop constraint if exists private_events_status_check;
alter table public.private_events add constraint private_events_status_check
  check (status in ('active', 'cancelled', 'makeup'));

alter table public.private_events drop constraint if exists private_events_makeup_for_fkey;
alter table public.private_events add constraint private_events_makeup_for_fkey
  foreign key (makeup_for) references public.private_events (id) on delete set null;

create index if not exists private_events_makeup_idx on public.private_events (makeup_for);

-- Cho API (PostgREST) nhận cột mới ngay.
notify pgrst, 'reload schema';
