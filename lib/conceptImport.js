// ---------------------------------------------------------------------------
// conceptImport.js — v23: nhập concept hàng loạt cho Knowledge Hub.
//
//   • parseConceptFile(file, opts) : đọc .xlsx/.xls/.csv (theo mẫu), .pptx, .docx
//       -> { rows: [{ title, summary, body, category, tags[], related[], include, note }], info }
//   • downloadConceptTemplate()    : tải file Excel mẫu.
//   • exportConceptRows(rows)      : xuất bảng xem trước ra Excel (để sửa rồi nạp lại).
//   • normTitle(s)                 : chuẩn hoá tiêu đề để so khớp (bỏ dấu, chữ thường).
//
// Không dùng AI: Word/PowerPoint được đọc theo cấu trúc
//   - PowerPoint: mỗi slide có tiêu đề = 1 concept, các gạch đầu dòng = nội dung.
//   - Word: mỗi Heading = 1 concept, các đoạn bên dưới = nội dung.
// SheetJS và JSZip được import động để không làm nặng các trang khác.
// ---------------------------------------------------------------------------

export const TEMPLATE_HEADERS = ['Concept', 'Tóm tắt', 'Nội dung', 'Nhóm', 'Tags', 'Liên kết với'];

const TEMPLATE_SAMPLE = [
  [
    'Integrated Marketing Communications (IMC)',
    'Phối hợp các công cụ truyền thông để truyền tải một thông điệp thống nhất.',
    '• Quảng cáo, PR, khuyến mãi, bán hàng cá nhân, marketing trực tiếp\n• Một thông điệp – nhiều điểm chạm',
    'Marketing Communications',
    'Buổi 1, IMC',
    'Customer Journey; Brand Positioning',
  ],
  [
    'Customer Journey',
    'Hành trình khách hàng từ nhận biết đến trung thành.',
    '• Awareness → Consideration → Purchase → Retention → Advocacy',
    'Marketing Communications',
    'Buổi 2',
    'Integrated Marketing Communications (IMC)',
  ],
  [
    'Brand Positioning',
    'Vị trí thương hiệu muốn chiếm trong tâm trí khách hàng mục tiêu.',
    '',
    'Branding',
    'Buổi 3',
    '',
  ],
];

const GUIDE = [
  ['Cột', 'Bắt buộc?', 'Cách điền'],
  ['Concept', 'Có', 'Tên khái niệm (mỗi dòng 1 concept).'],
  ['Tóm tắt', 'Không', '1–2 câu, hiện ở phần đầu khi bấm vào node.'],
  ['Nội dung', 'Không', 'Giải thích chi tiết, có thể xuống dòng (Alt+Enter).'],
  ['Nhóm', 'Không', 'Category — mỗi nhóm thành một bản đồ riêng (vd. tên môn học).'],
  ['Tags', 'Không', 'Ngăn cách bằng dấu phẩy, vd. "Buổi 3, IMC".'],
  ['Liên kết với', 'Không', 'Tên các concept liên quan, ngăn cách bằng dấu chấm phẩy ";". Có thể là concept trong file này hoặc đã có trên web.'],
];

// Lời nhắc gợi ý để nhờ Claude chuyển slide/bài giảng thành file theo mẫu.
export const CLAUDE_PROMPT = `Đọc file bài giảng đính kèm và tạo file Excel (.xlsx) gồm đúng 6 cột theo thứ tự:
Concept | Tóm tắt | Nội dung | Nhóm | Tags | Liên kết với
- Mỗi dòng là 1 khái niệm/kiến thức chính (bỏ các slide mở đầu, mục tiêu, cảm ơn, Q&A).
- Tóm tắt: 1–2 câu. Nội dung: các ý chính dạng gạch đầu dòng "• ".
- Nhóm: tên môn học hoặc chương. Tags: số buổi + từ khoá, ngăn cách bằng dấu phẩy.
- Liên kết với: tên các concept liên quan trong cùng file, ngăn cách bằng dấu chấm phẩy ";".
Giữ thuật ngữ gốc tiếng Anh, giải thích bằng tiếng Việt.`;

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
export function normTitle(s) {
  return (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[“”"'’‘]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[\s.:;,\-–—]+$/g, '')
    .trim();
}

// Tiêu đề kiểu "(tiếp)", "(cont.)", "(2)" -> gộp vào slide trước cùng tên.
function baseTitle(s) {
  return normTitle(s)
    .replace(/\s*[([]\s*(tiep(\s*theo)?|tt|cont(\.|inued)?|\d+|\d+\s*\/\s*\d+)\s*[)\]]\s*$/i, '')
    .replace(/\s*[-–—:]\s*(tiep(\s*theo)?|cont(\.|inued)?|part\s*\d+|phan\s*\d+)$/i, '')
    .trim();
}

const GENERIC = new Set([
  'agenda', 'outline', 'contents', 'content', 'noi dung', 'noi dung chinh', 'muc luc',
  'muc tieu', 'muc tieu bai hoc', 'muc tieu hoc tap', 'learning objectives', 'learning outcomes',
  'objectives', 'chuan dau ra', 'thank you', 'thanks', 'cam on', 'xin cam on', 'q&a', 'q & a',
  'questions', 'question', 'cau hoi', 'hoi dap', 'references', 'reference', 'tai lieu tham khao',
  'discussion', 'thao luan', 'bai tap', 'homework', 'exercise', 'exercises', 'quiz', 'review',
  'on tap', 'recap', 'tong ket', 'summary', 'tom tat', 'introduction', 'gioi thieu', 'welcome',
]);
export const isGenericTitle = (t) => GENERIC.has(normTitle(t));

function decodeXml(s) {
  return (s || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&');
}

const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\b${name}="([^"]*)"`));
  return m ? m[1] : null;
}

function parseRels(xml) {
  const map = {};
  (xml || '').replace(/<Relationship\b[^>]*>/g, (tag) => {
    const id = attr(tag, 'Id');
    const target = attr(tag, 'Target');
    if (id && target) map[id] = target;
    return tag;
  });
  return map;
}

function splitList(s, sep) {
  return (s == null ? '' : String(s))
    .split(sep)
    .map((x) => x.trim())
    .filter(Boolean);
}

// Tóm tắt = vài ý đầu, tối đa ~220 ký tự.
function makeSummary(lines) {
  let out = '';
  for (const l of lines) {
    const t = l.text.replace(/^[•\-–▸\s]+/, '');
    if (!t) continue;
    const next = out ? `${out} ${t}` : t;
    if (next.length > 220) {
      if (!out) out = `${t.slice(0, 217).trim()}…`;
      break;
    }
    out = /[.!?…:]$/.test(next) ? next : `${next}.`;
    if (out.length > 120) break;
  }
  return out;
}

function makeBody(lines) {
  return lines
    .map((l) => `${'  '.repeat(Math.max(0, l.level || 0))}${l.heading ? '▸ ' : '• '}${l.text}`)
    .join('\n');
}

function newRow(partial) {
  return {
    title: '',
    summary: '',
    body: '',
    category: '',
    tags: [],
    related: [],
    include: true,
    note: '',
    ...partial,
  };
}

// ---------------------------------------------------------------------------
// Excel / CSV theo mẫu
// ---------------------------------------------------------------------------
function findCol(header, re) {
  return header.findIndex((h) => re.test(normTitle(h)));
}

async function parseSheet(file) {
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  // Lấy sheet đầu tiên có cột "Concept" (bỏ qua sheet hướng dẫn).
  let rows = [];
  for (const name of wb.SheetNames) {
    const r = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, blankrows: false, raw: false });
    if (r.length && (r[0] || []).some((h) => /^(concept|khai niem|ten concept|tieu de|title)$/.test(normTitle(h)))) {
      rows = r;
      break;
    }
    if (!rows.length) rows = r;
  }
  if (!rows.length) return { rows: [], info: 'File trống.' };

  const header = (rows[0] || []).map((h) => (h == null ? '' : String(h)));
  let c = {
    title: findCol(header, /^(concept|khai niem|ten concept|tieu de|title)$/),
    summary: findCol(header, /^(tom tat|summary|mo ta ngan)$/),
    body: findCol(header, /^(noi dung|body|giai thich|chi tiet|description)$/),
    category: findCol(header, /^(nhom|category|mon hoc|chuong|danh muc)$/),
    tags: findCol(header, /^(tags?|the|tu khoa|keywords?)$/),
    related: findCol(header, /^(lien ket( voi)?|related|links?|concept lien quan)$/),
  };
  let start = 1;
  if (c.title < 0) {
    // Không có tiêu đề cột -> dùng đúng thứ tự cột của mẫu.
    c = { title: 0, summary: 1, body: 2, category: 3, tags: 4, related: 5 };
    start = 0;
  }
  const get = (row, i) => (i >= 0 && row[i] != null ? String(row[i]).trim() : '');

  const out = [];
  for (let i = start; i < rows.length; i++) {
    const row = rows[i] || [];
    const title = clean(get(row, c.title));
    if (!title) continue;
    out.push(
      newRow({
        title,
        summary: get(row, c.summary),
        body: get(row, c.body),
        category: get(row, c.category),
        tags: splitList(get(row, c.tags), /[,;]/),
        related: splitList(get(row, c.related), /[;\n]/),
      })
    );
  }
  return { rows: out, info: `Đọc ${out.length} concept từ file Excel.` };
}

// ---------------------------------------------------------------------------
// PowerPoint (.pptx)
// ---------------------------------------------------------------------------
function pptParagraphs(xml) {
  const out = [];
  const re = /<a:p\b[^>]*?(?<!\/)>([\s\S]*?)<\/a:p>/g;
  let m;
  while ((m = re.exec(xml))) {
    const inner = m[1];
    const text = clean(
      decodeXml(
        inner
          .replace(/<a:br\b[^>]*\/>/g, ' ')
          .match(/<a:t(?:\s[^>]*)?>[^<]*<\/a:t>/g)
          ?.map((t) => t.replace(/<[^>]+>/g, ''))
          .join('') || ''
      )
    );
    if (!text) continue;
    const lvl = inner.match(/<a:pPr\b[^>]*\blvl="(\d)"/);
    out.push({ text, level: lvl ? parseInt(lvl[1], 10) : 0 });
  }
  return out;
}

function parseSlideXml(xml) {
  let title = '';
  let cover = false;
  const lines = [];
  const shapes = xml.match(/<p:sp\b[\s\S]*?<\/p:sp>|<p:graphicFrame\b[\s\S]*?<\/p:graphicFrame>/g) || [];
  for (const sp of shapes) {
    const ph = sp.match(/<p:ph\b[^>]*>/);
    const type = ph ? attr(ph[0], 'type') : null;
    if (['sldNum', 'dt', 'ftr', 'hdr'].includes(type)) continue;
    const paras = pptParagraphs(sp);
    if (!paras.length) continue;
    if ((type === 'title' || type === 'ctrTitle') && !title) {
      title = clean(paras.map((p) => p.text).join(' '));
      cover = type === 'ctrTitle';
      continue;
    }
    lines.push(...paras);
  }
  // Không có ô tiêu đề -> lấy dòng đầu tiên nếu ngắn.
  if (!title && lines.length && lines[0].text.length <= 90) {
    title = lines.shift().text;
  }
  return { title, lines, cover };
}

async function parsePptx(file, opts) {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());

  // Thứ tự slide theo presentation.xml (đúng thứ tự trình chiếu).
  let slidePaths = [];
  const pres = await zip.file('ppt/presentation.xml')?.async('string');
  const presRels = parseRels(await zip.file('ppt/_rels/presentation.xml.rels')?.async('string'));
  if (pres) {
    (pres.match(/<p:sldId\b[^>]*>/g) || []).forEach((tag) => {
      const rid = attr(tag, 'r:id');
      const target = rid && presRels[rid];
      if (target) slidePaths.push(`ppt/${target.replace(/^\/?ppt\//, '').replace(/^\.\//, '')}`);
    });
  }
  if (!slidePaths.length) {
    slidePaths = Object.keys(zip.files)
      .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
      .sort((a, b) => parseInt(a.match(/(\d+)\.xml$/)[1], 10) - parseInt(b.match(/(\d+)\.xml$/)[1], 10));
  }

  const rows = [];
  let slideNo = 0;
  let lessonTitle = '';
  for (const path of slidePaths) {
    slideNo += 1;
    const xml = await zip.file(path)?.async('string');
    if (!xml) continue;
    if (/<p:sld\b[^>]*\bshow="0"/.test(xml)) continue; // slide ẩn
    const { title, lines, cover } = parseSlideXml(xml);

    // Speaker notes
    let notes = [];
    if (opts.includeNotes) {
      const relPath = path.replace(/slides\/(slide\d+\.xml)$/, 'slides/_rels/$1.rels');
      const rels = parseRels(await zip.file(relPath)?.async('string'));
      const notesTarget = Object.values(rels).find((t) => /notesSlide\d+\.xml$/.test(t));
      if (notesTarget) {
        const np = `ppt/${notesTarget.replace(/^(\.\.\/)+/, '')}`;
        const nxml = await zip.file(np)?.async('string');
        if (nxml) {
          const shapes = nxml.match(/<p:sp\b[\s\S]*?<\/p:sp>/g) || [];
          shapes.forEach((sp) => {
            const ph = sp.match(/<p:ph\b[^>]*>/);
            if (ph && attr(ph[0], 'type') === 'body') notes.push(...pptParagraphs(sp));
          });
        }
      }
    }

    if (!title) continue;
    if (cover) {
      // Slide bìa: giữ lại để biết tên bài, mặc định không nhập.
      if (!lessonTitle) lessonTitle = title;
      rows.push(newRow({ title, include: false, note: `Slide ${slideNo} · slide bìa`, _from: slideNo, _lines: [...lines], _notes: notes, _cover: true }));
      continue;
    }

    // Gộp slide "(tiếp)" vào slide trước cùng tên.
    const prev = rows[rows.length - 1];
    if (prev && !prev._cover && baseTitle(prev.title) === baseTitle(title) && baseTitle(title)) {
      prev._lines.push(...lines);
      prev._notes.push(...notes);
      prev.note = `Slide ${prev._from}–${slideNo}`;
      continue;
    }
    rows.push(
      newRow({
        title: title.replace(/\s*[([]\s*(tiếp(\s*theo)?|tt|cont\.?)\s*[)\]]\s*$/i, ''),
        include: lines.length > 0 && !isGenericTitle(title),
        note: `Slide ${slideNo}`,
        _from: slideNo,
        _lines: [...lines],
        _notes: notes,
      })
    );
  }

  rows.forEach((r) => {
    r.summary = makeSummary(r._lines);
    r.body = makeBody(r._lines);
    if (r._notes.length) {
      r.body = `${r.body}${r.body ? '\n\n' : ''}Ghi chú: ${r._notes.map((n) => n.text).join(' ')}`;
      if (!r.summary) r.summary = makeSummary(r._notes);
    }
    if (r._cover) { /* đã ghi chú */ }
    else if (!r.include && isGenericTitle(r.title)) r.note += ' · slide chung (bỏ qua)';
    else if (!r.include) r.note += ' · không có nội dung';
    delete r._cover;
    delete r._lines;
    delete r._notes;
    delete r._from;
  });

  if (opts.linkSequential) {
    const kept = rows.filter((r) => r.include);
    for (let i = 1; i < kept.length; i++) kept[i].related.push(kept[i - 1].title);
  }
  return {
    rows,
    docTitle: lessonTitle,
    info: `Đọc ${slidePaths.length} slide → ${rows.length} concept (đã chọn ${rows.filter((r) => r.include).length}).`,
  };
}

// ---------------------------------------------------------------------------
// Word (.docx)
// ---------------------------------------------------------------------------
function docxStyleLevels(stylesXml) {
  const levels = {};
  (stylesXml || '').replace(/<w:style\b[^>]*>[\s\S]*?<\/w:style>/g, (block) => {
    const open = block.match(/<w:style\b[^>]*>/)[0];
    const id = attr(open, 'w:styleId');
    if (!id) return block;
    const name = (block.match(/<w:name w:val="([^"]*)"/) || [])[1] || '';
    const ol = block.match(/<w:outlineLvl w:val="(\d)"/);
    let lvl = null;
    if (/^title$/i.test(name) || /^title$/i.test(id)) lvl = 0;
    else if (ol && ol[1] !== '9') lvl = parseInt(ol[1], 10) + 1;
    else {
      const m = name.match(/^heading\s*(\d)$/i) || id.match(/^heading\s*(\d)$/i);
      if (m) lvl = parseInt(m[1], 10);
    }
    if (lvl != null) levels[id] = lvl;
    return block;
  });
  return levels;
}

async function parseDocx(file, opts) {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const doc = await zip.file('word/document.xml')?.async('string');
  if (!doc) return { rows: [], info: 'Không đọc được nội dung file Word.' };
  const styleLv = docxStyleLevels(await zip.file('word/styles.xml')?.async('string'));

  // Danh sách đoạn: { text, level (heading 1..n | null), list, bold }
  const paras = [];
  const re = /<w:p\b[^>]*?(?<!\/)>([\s\S]*?)<\/w:p>/g;
  let m;
  while ((m = re.exec(doc))) {
    const inner = m[1];
    const text = clean(
      decodeXml(
        (inner.replace(/<w:tab\/>/g, '<w:t> </w:t>').match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g) || [])
          .map((t) => t.replace(/<[^>]+>/g, ''))
          .join('')
      )
    );
    if (!text) continue;
    const style = (inner.match(/<w:pStyle w:val="([^"]+)"/) || [])[1];
    const ol = inner.match(/<w:pPr>[\s\S]*?<w:outlineLvl w:val="(\d)"/);
    let level = null;
    if (ol && ol[1] !== '9') level = parseInt(ol[1], 10) + 1;
    else if (style && styleLv[style] != null) level = styleLv[style];
    const runs = inner.match(/<w:r\b[\s\S]*?<\/w:r>/g) || [];
    const textRuns = runs.filter((r) => /<w:t[\s>]/.test(r));
    const bold =
      textRuns.length > 0 &&
      textRuns.every((r) => /<w:b\/>|<w:b w:val="(true|1|on)"\/>/.test(r));
    paras.push({ text, level, list: /<w:numPr>/.test(inner) || /list/i.test(style || ''), bold });
  }

  // Không có Heading -> coi đoạn ngắn in đậm toàn bộ là tiêu đề cấp 1.
  let usedBold = false;
  if (!paras.some((p) => p.level >= 1)) {
    paras.forEach((p) => {
      if (p.bold && p.text.length <= 90 && !p.list) {
        p.level = 1;
        usedBold = true;
      }
    });
  }
  const headingLevels = paras.filter((p) => p.level >= 1).map((p) => p.level);
  if (!headingLevels.length) {
    return {
      rows: [],
      info:
        'Không tìm thấy tiêu đề (Heading) trong file Word. Hãy định dạng tên mỗi khái niệm bằng Heading 1/Heading 2 hoặc dùng file Excel theo mẫu.',
    };
  }

  // Cấp concept: tự chọn nếu không chỉ định.
  const minLv = Math.min(...headingLevels);
  const count = (l) => headingLevels.filter((x) => x === l).length;
  let conceptLv = opts.docxLevel && opts.docxLevel !== 'auto' ? parseInt(opts.docxLevel, 10) : null;
  if (!conceptLv) conceptLv = count(minLv) >= 3 || !count(minLv + 1) ? minLv : minLv + 1;

  const rows = [];
  const stack = []; // tiêu đề cha theo cấp
  let current = null;
  const docTitle = paras.find((p) => p.level === 0)?.text || '';

  for (const p of paras) {
    if (p.level === 0) continue;
    if (p.level >= 1 && p.level <= conceptLv) {
      // Đóng các cấp sâu hơn hoặc bằng.
      while (stack.length && stack[stack.length - 1].level >= p.level) stack.pop();
      const parent = stack[stack.length - 1];
      current = newRow({
        title: p.text,
        include: !isGenericTitle(p.text),
        note: `Heading ${p.level}${usedBold ? ' (chữ đậm)' : ''}`,
        related: opts.linkHierarchy && parent ? [parent.title] : [],
        _lines: [],
        _level: p.level,
      });
      rows.push(current);
      stack.push({ level: p.level, title: p.text });
      continue;
    }
    if (!current) continue; // đoạn mở đầu trước tiêu đề đầu tiên
    if (p.level > conceptLv) {
      current._lines.push({ text: p.text, level: 0, heading: true });
    } else {
      current._lines.push({ text: p.text, level: p.list ? 1 : 0 });
    }
  }

  rows.forEach((r) => {
    r.summary = makeSummary(r._lines.filter((l) => !l.heading));
    r.body = r._lines
      .map((l) => (l.heading ? `▸ ${l.text}` : `${l.level ? '  • ' : ''}${l.text}`))
      .join('\n');
    if (!r._lines.length && r._level === conceptLv) {
      r.include = false;
      r.note += ' · không có nội dung';
    } else if (isGenericTitle(r.title)) {
      r.note += ' · mục chung (bỏ qua)';
    }
    delete r._lines;
    delete r._level;
  });

  if (opts.linkSequential) {
    const kept = rows.filter((r) => r.include);
    for (let i = 1; i < kept.length; i++) {
      if (!kept[i].related.includes(kept[i - 1].title)) kept[i].related.push(kept[i - 1].title);
    }
  }

  return {
    rows,
    docTitle,
    info: `Đọc ${paras.length} đoạn → ${rows.length} concept theo Heading ${conceptLv}${
      conceptLv > minLv ? ` (các Heading ${minLv} là concept cha)` : ''
    } · đã chọn ${rows.filter((r) => r.include).length}.`,
  };
}

// ---------------------------------------------------------------------------
// API chính
// ---------------------------------------------------------------------------
export async function parseConceptFile(file, opts = {}) {
  const name = (file?.name || '').toLowerCase();
  if (name.endsWith('.pptx')) return parsePptx(file, opts);
  if (name.endsWith('.docx')) return parseDocx(file, opts);
  if (/\.(xlsx|xls|csv)$/.test(name)) return parseSheet(file);
  if (name.endsWith('.ppt') || name.endsWith('.doc')) {
    return {
      rows: [],
      info: 'File .ppt/.doc là định dạng cũ. Hãy mở bằng PowerPoint/Word và "Save As" sang .pptx/.docx rồi tải lại.',
    };
  }
  return { rows: [], info: 'Chỉ hỗ trợ .xlsx, .csv, .pptx, .docx.' };
}

// Nối "A nhắc tới tên B" -> liên kết A → B (gồm cả concept đã có trên web).
export function addMentionLinks(rows, existingTitles = []) {
  const candidates = [
    ...rows.filter((r) => r.include).map((r) => r.title),
    ...existingTitles,
  ]
    .filter((t) => t && t.length >= 4)
    .map((t) => ({ t, n: normTitle(t) }));
  return rows.map((r) => {
    if (!r.include) return r;
    const hay = normTitle(`${r.summary} ${r.body}`);
    const self = normTitle(r.title);
    const related = [...r.related];
    const have = new Set(related.map(normTitle));
    candidates.forEach(({ t, n }) => {
      if (n === self || have.has(n)) return;
      const esc = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`).test(hay)) {
        related.push(t);
        have.add(n);
      }
    });
    return { ...r, related };
  });
}

export async function downloadConceptTemplate() {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...TEMPLATE_SAMPLE]);
  ws['!cols'] = [{ wch: 36 }, { wch: 50 }, { wch: 60 }, { wch: 24 }, { wch: 20 }, { wch: 40 }];
  const guide = XLSX.utils.aoa_to_sheet([...GUIDE, [], ['Gợi ý: nhờ Claude tạo file này từ slide với lời nhắc sau'], [CLAUDE_PROMPT]]);
  guide['!cols'] = [{ wch: 16 }, { wch: 12 }, { wch: 90 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Concepts');
  XLSX.utils.book_append_sheet(wb, guide, 'Huong dan');
  XLSX.writeFile(wb, 'Mau_nhap_concept_Knowledge_Hub.xlsx');
}

export async function exportConceptRows(rows, filename = 'Concepts_xem_truoc.xlsx') {
  const XLSX = await import('xlsx');
  const aoa = [
    TEMPLATE_HEADERS,
    ...rows
      .filter((r) => r.include)
      .map((r) => [r.title, r.summary, r.body, r.category, r.tags.join(', '), r.related.join('; ')]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 36 }, { wch: 50 }, { wch: 60 }, { wch: 24 }, { wch: 20 }, { wch: 40 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Concepts');
  XLSX.writeFile(wb, filename);
}
