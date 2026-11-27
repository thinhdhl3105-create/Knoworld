-- =====================================================================
-- v67 · Creative City
--   1) Ảnh Lạ: 31 câu hỏi dùng ẢNH THẬT (Wikimedia Commons, giấy phép tự do),
--      phóng sát một chi tiết; lộ đáp án mới thấy toàn cảnh. Tắt 6 câu hình vẽ cũ.
--   2) Xưởng Vẽ: đổi từ "sản phẩm thương hiệu" sang ĐỀ VẼ VUI (không tên nhãn hàng).
--   3) Đếm số máy đã quét QR (bảng cc_scans + hàm cc_scan) cho màn chiếu.
-- Chạy 1 lần trong Supabase → SQL Editor. Chạy lại cũng không sao.
-- =====================================================================

-- 3) quét QR --------------------------------------------------------------
create table if not exists public.cc_scans (
  room     text not null references public.cc_rooms(code) on delete cascade on update cascade,
  visitor  text not null,
  at       timestamptz not null default now(),
  primary key (room, visitor)
);
alter table public.cc_scans enable row level security;
drop policy if exists cc_scans_admin on public.cc_scans;
create policy cc_scans_admin on public.cc_scans for all to authenticated using (public.cc_is_admin()) with check (public.cc_is_admin());
revoke all on public.cc_scans from anon;
grant select, insert, update, delete on public.cc_scans to authenticated;

create or replace function public.cc_scan(p_room text, p_visitor text)
returns void language plpgsql security definer set search_path = public as $$
declare v_room text := upper(btrim(coalesce(p_room, '')));
begin
  if coalesce(p_visitor, '') = '' or length(p_visitor) > 64 then return; end if;
  if not exists (select 1 from public.cc_rooms where code = v_room and is_open) then return; end if;
  insert into public.cc_scans (room, visitor) values (v_room, p_visitor) on conflict do nothing;
end $$;
grant execute on function public.cc_scan(text, text) to anon, authenticated;

-- "Làm mới phòng" cũng xoá luôn lượt quét
create or replace function public.cc_scans_reset() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.cc_players where room = old.room) = 0 then delete from public.cc_scans where room = old.room; end if;
  return null;
end $$;
drop trigger if exists cc_scans_reset on public.cc_players;
create trigger cc_scans_reset after delete on public.cc_players for each row execute function public.cc_scans_reset();

-- 1) Ảnh Lạ bằng ảnh thật -------------------------------------------------
update public.cc_questions set active = false where builtin is not null and image_path is null;

insert into public.cc_questions (sort, question, opts, ok, image_path)
select v.sort, v.question, v.opts, v.ok, v.image_path from (values
  (1, 'Vằn đen trắng này là của…', array['Bò sữa', 'Ngựa vằn', 'Gấu trúc', 'Hổ'], 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Close-up_of_Plains_Zebra_Stripe_Pattern.jpg/960px-Close-up_of_Plains_Zebra_Stripe_Pattern.jpg#z=2.5&x=50&y=50'),
  (2, 'Những răng kim loại này là…', array['Xích xe đạp', 'Dây kéo (khóa kéo)', 'Lò xo', 'Dây đồng hồ'], 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Macro_YKK_Zipper.jpg/960px-Macro_YKK_Zipper.jpg#z=3&x=50&y=50'),
  (3, 'Vật kim loại có lỗ này là…', array['Vỉ nướng', 'Cái rây bột', 'Cái bào rau củ', 'Cái muôi thủng'], 2, 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/R%C3%A2pe_%C3%A0_fromage_-_envers.jpg/960px-R%C3%A2pe_%C3%A0_fromage_-_envers.jpg#z=3&x=35&y=45'),
  (4, 'Những vảy nhỏ xếp lớp này là…', array['Lông chim', 'Cánh bướm', 'Da rắn', 'Vảy cá'], 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Butterfly_wing_scales.jpg/960px-Butterfly_wing_scales.jpg#z=2&x=50&y=50'),
  (5, 'Cánh gỗ xếp hình sao này là…', array['Đinh hương', 'Hoa hồi', 'Quế', 'Thảo quả'], 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Illicium_verum20170511_7548.jpg/960px-Illicium_verum20170511_7548.jpg#z=3&x=50&y=50'),
  (6, 'Những lớp trắng này là…', array['Củ tỏi', 'Bắp cải', 'Củ cải trắng', 'Củ hành tây'], 3, 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/White_onion_cross_section.jpg/960px-White_onion_cross_section.jpg#z=3&x=50&y=50'),
  (7, 'Hoa văn tím uốn lượn này là…', array['San hô', 'Bắp cải tím cắt đôi', 'Củ dền', 'Hành tím'], 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Red_Cabbage_cross_section_showing_spirals.jpg/960px-Red_Cabbage_cross_section_showing_spirals.jpg#z=2.5&x=50&y=50'),
  (8, 'Những sợi lông đỏ này thuộc về…', array['Thanh long', 'Vải thiều', 'Chôm chôm', 'Nhãn'], 2, 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Rambutan_white_background_alt.jpg/960px-Rambutan_white_background_alt.jpg#z=3.5&x=30&y=50'),
  (9, 'Họa tiết lấp lánh này là…', array['Vỏ ốc', 'Vảy cá', 'Cánh bướm', 'Lông công'], 3, 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Peacock_feather_close-up.jpg/960px-Peacock_feather_close-up.jpg#z=3&x=50&y=55'),
  (10, 'Rừng cây tí hon này là…', array['Ngò rí', 'Bông cải xanh', 'Lá hẹ', 'Rêu'], 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Broccoli_and_cross_section_edit.jpg/960px-Broccoli_and_cross_section_edit.jpg#z=3.5&x=30&y=35'),
  (11, 'Những sợi nhỏ này là…', array['Lược chải tóc', 'Chổi quét nhà', 'Cọ vẽ', 'Bàn chải đánh răng'], 3, 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Toothbrush_BNC.jpg/960px-Toothbrush_BNC.jpg#z=5&x=90&y=22'),
  (12, 'Bề mặt lỗ chỗ này là…', array['Bánh mì', 'Miếng mút rửa chén', 'Phô mai', 'Đá bọt'], 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Sponge_Macro.jpg/960px-Sponge_Macro.jpg#z=2.5&x=50&y=50'),
  (13, 'Những hạt li ti này nằm trên…', array['Quả thanh long', 'Quả ớt', 'Quả dâu tây', 'Quả cà chua'], 2, 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Strawberry_macro_shot.jpg/960px-Strawberry_macro_shot.jpg#z=3.5&x=50&y=50'),
  (14, 'Vòng xoắn này là của…', array['Cuộn dây', 'Vỏ ốc sên', 'Vỏ sò', 'Bánh cuộn'], 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Banded_snail_shell.jpg/960px-Banded_snail_shell.jpg#z=6&x=55&y=42'),
  (15, 'Ruột của loại quả nào?', array['Mãng cầu', 'Kiwi', 'Chanh dây', 'Thanh long'], 3, 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Dragon_Fruit_cut_by_Shyamal.jpg/960px-Dragon_Fruit_cut_by_Shyamal.jpg#z=3&x=30&y=50'),
  (16, 'Những hạt đỏ mọng này là…', array['Hạt điều', 'Trứng cá hồi', 'Hạt lựu', 'Kẹo dẻo'], 2, 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Pomegranate_arils.jpg/960px-Pomegranate_arils.jpg#z=3&x=50&y=50'),
  (17, 'Đây là bên trong của…', array['Vải thiều', 'Hạt mít', 'Tỏi', 'Măng cụt'], 3, 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Mangosteens_-_whole_and_opened.jpg/960px-Mangosteens_-_whole_and_opened.jpg#z=3&x=72&y=50'),
  (18, 'Lớp vỏ gai này của…', array['Sầu riêng', 'Mít', 'Vỏ hạt dẻ', 'Chôm chôm'], 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Durian_fruit_singapore.jpg/960px-Durian_fruit_singapore.jpg#z=3&x=50&y=40'),
  (19, 'Những lỗ tròn này là…', array['Tổ ong', 'Bông tắm', 'Gương sen', 'Vỏ cua'], 2, 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Seed_pod_of_an_American_lotus.jpg/960px-Seed_pod_of_an_American_lotus.jpg#z=2.5&x=50&y=55'),
  (20, 'Những đầu đỏ này là…', array['Đầu bút chì màu', 'Đinh ghim', 'Que diêm', 'Đầu tăm bông'], 2, 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Closeup_of_match_stick_heads.jpg/960px-Closeup_of_match_stick_heads.jpg#z=3&x=50&y=40'),
  (21, 'Những vảy nâu xếp lớp này là…', array['Vỏ dứa', 'Vảy cá', 'Quả thông', 'Vỏ cây dừa'], 2, 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Scrub_Pine_Pinus_virginiana_Cone_Closeup_2000px.jpg/960px-Scrub_Pine_Pinus_virginiana_Cone_Closeup_2000px.jpg#z=3&x=50&y=50'),
  (22, 'Lớp lông vàng này là…', array['Bông gòn', 'Bóng tennis', 'Khăn tắm', 'Thảm cỏ nhân tạo'], 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Tennis_Ball_Felt_Zoom-In_View.jpg/960px-Tennis_Ball_Felt_Zoom-In_View.jpg#z=2&x=50&y=50'),
  (23, 'Họa tiết mềm này là…', array['Vỏ cây', 'Vải len', 'Lá khô', 'Lông chim cú'], 3, 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Owl_feather.JPG/960px-Owl_feather.JPG#z=3&x=50&y=50'),
  (24, 'Đường đan này là của…', array['Nón lá', 'Giỏ tre', 'Quạt nan', 'Chiếu cói'], 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Vietnamese_conical_hat_nonla.jpg/960px-Vietnamese_conical_hat_nonla.jpg#z=3&x=50&y=45'),
  (25, 'Lát cắt của loại quả nào?', array['Ổi', 'Chanh dây', 'Dưa hấu', 'Kiwi'], 3, 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Kiwifruit_cross_section.jpg/960px-Kiwifruit_cross_section.jpg#z=3&x=50&y=50'),
  (26, 'Chấm tròn này nằm trên…', array['Nút áo', 'Bánh quy', 'Xúc xắc', 'Quân domino'], 2, 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Spielw%C3%BCrfel.jpg/960px-Spielw%C3%BCrfel.jpg#z=5&x=38&y=45'),
  (27, 'Cận cảnh mũi của con gì?', array['Con heo', 'Con thỏ', 'Con chó', 'Con mèo'], 3, 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Cat_nose_close-up.jpg/960px-Cat_nose_close-up.jpg#z=3&x=50&y=45'),
  (28, 'Lớp da nhăn này của con gì?', array['Hà mã', 'Cá sấu', 'Con voi', 'Tê giác'], 2, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/African_Bush_Elephant.jpg/960px-African_Bush_Elephant.jpg#z=4&x=50&y=55'),
  (29, 'Sợi nâu xơ xác này là…', array['Gỗ mục', 'Rơm', 'Lông thú', 'Xơ dừa'], 3, 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Dry_coconut_husk.jpg/960px-Dry_coconut_husk.jpg#z=2.5&x=50&y=50'),
  (30, 'Bề mặt sần sùi này là…', array['Mướp hương', 'Bí đao non', 'Dưa leo gai', 'Khổ qua (mướp đắng)'], 3, 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Momordica_charantia_01052014.jpg/960px-Momordica_charantia_01052014.jpg#z=3&x=45&y=45'),
  (31, 'Những múi vàng này là gì?', array['Xoài cắt miếng', 'Múi sầu riêng', 'Múi bưởi', 'Múi mít'], 3, 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Jackfruit_Flesh.jpg/960px-Jackfruit_Flesh.jpg#z=3&x=50&y=50')
) as v(sort, question, opts, ok, image_path)
where not exists (select 1 from public.cc_questions q where q.image_path = v.image_path);

-- 2) Xưởng Vẽ: đề vẽ vui thay cho thương hiệu ---------------------------
update public.cc_brands set active = false
 where name in ('Tương ớt Chin-su', 'Vinamilk', 'Trà Xanh Không Độ', 'Nước mắm Nam Ngư', 'Cà phê G7', 'Biti''s Hunter', 'Number 1');

insert into public.cc_brands (name, item, sort, active) values
  ('Khỉ đi siêu thị',        'Một chú khỉ đẩy xe đi siêu thị — nó bỏ gì vào giỏ?', 1, true),
  ('Lon nước cá tính',       'Một lon nước ngọt có tính cách riêng: cho nó khuôn mặt, tay chân và một biểu cảm thật “ngầu”', 2, true),
  ('Mèo phi hành gia',       'Chú mèo lần đầu bay lên vũ trụ — nó mang theo món gì?', 3, true),
  ('Voi đi học',             'Một chú voi đi học cấp 3: cặp sách, đồng phục, chỗ ngồi trong lớp…', 4, true),
  ('Hộp sữa đi du lịch',     'Một hộp sữa xách vali đi du lịch — nó đang ở đâu?', 5, true),
  ('Gà làm ca sĩ',           'Chú gà trống đứng trên sân khấu làm ca sĩ nổi tiếng', 6, true),
  ('Đôi giày biết chạy',     'Một đôi giày tự chạy trốn khỏi chủ — vì sao vậy?', 7, true),
  ('Gấu trúc bán online',    'Gấu trúc mở shop bán hàng online — nó bán gì, livestream ra sao?', 8, true),
  ('Bánh mì siêu anh hùng',  'Ổ bánh mì biến thành siêu anh hùng: áo choàng, siêu năng lực…', 9, true),
  ('Ly trà sữa sinh nhật',   'Ly trà sữa tổ chức tiệc sinh nhật — khách mời là ai?', 10, true),
  ('Cua chạy xe máy',        'Một chú cua chạy xe máy giữa phố — nó đi ngang hay đi thẳng?', 11, true),
  ('Rùa giao hàng nhanh',    'Chú rùa làm shipper “giao hàng siêu tốc”', 12, true),
  ('Cá voi biết bay',        'Một con cá voi bay lơ lửng trên thành phố', 13, true),
  ('Cây bút biết nói',       'Cây bút chì có thể nói chuyện — nó đang than phiền điều gì?', 14, true),
  ('Đèn lồng nhảy múa',      'Chiếc đèn lồng Trung thu đang nhảy múa — vẽ cả điệu nhảy của nó', 15, true),
  ('Chai nước tương lai',    'Chai nước uống của năm 2050 trông như thế nào?', 16, true)
on conflict (name) do update set item = excluded.item, sort = excluded.sort, active = true;
