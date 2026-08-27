import * as XLSX from 'xlsx';

export interface TaskViewItem {
  id?: string;
  stt: number;
  status: string; // 'Giao việc' | 'Đang thực thi' | 'Đã hoàn thành' | 'Huỷ'
  deadline: string | null;
  department: string; // 'Công việc' (Nhóm công việc)
  description: string; // 'Chi tiết'
  name: string; // 'Tên task'
  assignee: string | null; // 'Name'
  note: string | null; // 'File hoàn thành (nếu có)'
  sources: string[]; // ['Nguồn 1', 'Nguồn 2']
  checklist?: { text: string; done?: boolean; url?: string }[];
}

export function formatExcelDate(val: any): string | null {
  if (val === null || val === undefined || val === '') return null;
  if (val instanceof Date && !isNaN(val.getTime())) {
    const day = String(val.getDate()).padStart(2, '0');
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const year = val.getFullYear();
    return `${day}/${month}/${year}`;
  }
  if (typeof val === 'number') {
    // Excel serial date
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
  }
  const str = String(val).trim();
  if (str.startsWith('2026-') || str.startsWith('2025-')) {
    // ISO date format YYYY-MM-DD
    const parts = str.split(' ')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return str.length > 0 ? str : null;
}

export function parseTaskViewRows(rows: any[][]): TaskViewItem[] {
  if (!rows || rows.length < 2) return [];

  const tasks: TaskViewItem[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row)) continue;

    const noVal = row[0];
    const statusVal = row[1];
    const deadlineVal = row[2];
    const deptVal = row[3];
    const detailVal = row[4];
    const assigneeVal = row[5];
    const fileVal = row[6];
    const src1Val = row[7];
    const src2Val = row[8];

    // Skip empty row
    if (
      (noVal === null || noVal === undefined || String(noVal).trim() === '') &&
      !statusVal &&
      !deptVal &&
      !detailVal &&
      !assigneeVal &&
      !fileVal &&
      !src1Val &&
      !src2Val
    ) {
      continue;
    }

    const stt = typeof noVal === 'number' ? noVal : (parseInt(String(noVal), 10) || (tasks.length + 1));
    const statusRaw = String(statusVal || 'Giao việc').trim();
    let status = 'Giao việc';
    if (statusRaw.toLowerCase().includes('hoàn thành') || statusRaw === 'Đã hoàn thành') status = 'Đã hoàn thành';
    else if (statusRaw.toLowerCase().includes('thực thi') || statusRaw === 'Đang thực thi') status = 'Đang thực thi';
    else if (statusRaw.toLowerCase().includes('huỷ') || statusRaw.toLowerCase().includes('hủy')) status = 'Huỷ';
    else status = 'Giao việc';

    const deadline = formatExcelDate(deadlineVal);
    const department = String(deptVal || 'Tổng hợp').trim();
    const description = String(detailVal || deptVal || '').trim();
    const name = String(deptVal || detailVal || `Công việc #${stt}`).trim();
    const assignee = assigneeVal ? String(assigneeVal).trim() : null;
    const note = fileVal ? String(fileVal).trim() : null;

    const sources: string[] = [];
    if (src1Val && String(src1Val).trim()) sources.push(String(src1Val).trim());
    if (src2Val && String(src2Val).trim()) sources.push(String(src2Val).trim());

    const checklist = sources.map((s, idx) => ({
      text: `Nguồn ${idx + 1}`,
      url: s,
      done: status === 'Đã hoàn thành',
    }));

    tasks.push({
      stt,
      status,
      deadline,
      department,
      description,
      name,
      assignee,
      note,
      sources,
      checklist,
    });
  }

  return tasks;
}

export function parseTaskViewBuffer(buffer: Buffer): TaskViewItem[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('timeline')) || workbook.SheetNames[0];
  if (!sheetName) return [];
  const worksheet = workbook.Sheets[sheetName];

  // Recalculate full range to ensure no rows are missed
  let maxR = 0;
  let maxC = 0;
  for (const key of Object.keys(worksheet)) {
    if (key.startsWith('!')) continue;
    const cell = XLSX.utils.decode_cell(key);
    if (cell.r > maxR) maxR = cell.r;
    if (cell.c > maxC) maxC = cell.c;
  }
  worksheet['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: Math.max(maxC, 8) } });

  const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
  return parseTaskViewRows(rows);
}
