// ---------------------------------------------------------------------------
// studentSheet.js — Tải file Excel mẫu & đọc danh sách MSSV từ file upload.
//
//   • downloadStudentTemplate() : xuất file .xlsx mẫu (cột "MSSV", "Họ tên")
//     có sẵn vài dòng ví dụ để admin điền rồi upload ngược lại.
//   • parseStudentFile(file)    : đọc file người dùng chọn và trả về
//     [{ student_id, full_name }]. Hỗ trợ .xlsx / .xls (SheetJS) và
//     .csv / .txt (đọc text, dùng lại parseStudentList).
//
// SheetJS được import động (dynamic import) để chỉ tải khi cần -> không làm
// nặng bundle của các trang khác.
// ---------------------------------------------------------------------------

import { parseStudentList } from './access';

const TEMPLATE_HEADERS = ['MSSV', 'Họ tên'];
const TEMPLATE_SAMPLE = [
  ['2153001', 'Nguyễn Văn A'],
  ['2153002', 'Trần Thị B'],
  ['2153003', 'Lê Hoàng C'],
];

// Bỏ dấu tiếng Việt để so khớp tiêu đề ("Họ tên" ~ "ho ten").
function stripAccents(s) {
  return (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function isIdHeader(h) {
  const s = stripAccents(h);
  return /(mssv|ma\s*so|student|^id$|masv)/.test(s);
}

function isNameHeader(h) {
  const s = stripAccents(h);
  return /(ho\s*ten|full\s*name|^name$|^ten$|hoten)/.test(s);
}

// Chuyển mảng-của-mảng (rows) từ sheet thành [{ student_id, full_name }].
function rowsToStudents(rows) {
  const out = [];
  if (!rows || !rows.length) return out;

  // Xác định hàng tiêu đề (nếu có) để biết cột nào là MSSV / Họ tên.
  const first = rows[0].map((c) => (c == null ? '' : String(c)));
  const hasHeader = first.some((c) => isIdHeader(c) || isNameHeader(c));

  let idCol = 0;
  let nameCol = 1;
  let start = 0;

  if (hasHeader) {
    const idFound = first.findIndex(isIdHeader);
    const nameFound = first.findIndex(isNameHeader);
    if (idFound >= 0) idCol = idFound;
    if (nameFound >= 0) nameCol = nameFound;
    start = 1; // bỏ hàng tiêu đề
  }

  for (let i = start; i < rows.length; i++) {
    const row = rows[i] || [];
    const id = (row[idCol] == null ? '' : String(row[idCol])).trim();
    if (!id) continue;
    const name = (row[nameCol] == null ? '' : String(row[nameCol])).trim();
    out.push({ student_id: id.toUpperCase(), full_name: name });
  }
  return out;
}

// Đọc file Excel (.xlsx/.xls) -> [{ student_id, full_name }].
async function parseExcel(file) {
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  // header:1 -> trả về mảng-của-mảng, giữ nguyên vị trí cột.
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, raw: false });
  return rowsToStudents(rows);
}

// API chính: đọc file bất kỳ (Excel hoặc CSV/txt).
export async function parseStudentFile(file) {
  const name = (file?.name || '').toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return parseExcel(file);
  }
  // CSV / TXT: đọc dạng text rồi dùng parser dòng sẵn có.
  const text = await file.text();
  return parseStudentList(text);
}

// Xuất file Excel mẫu và kích hoạt tải xuống trong trình duyệt.
export async function downloadStudentTemplate() {
  const XLSX = await import('xlsx');
  const aoa = [TEMPLATE_HEADERS, ...TEMPLATE_SAMPLE];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 16 }, { wch: 30 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Danh sach sinh vien');
  XLSX.writeFile(wb, 'Mau_danh_sach_sinh_vien.xlsx');
}
