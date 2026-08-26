import * as XLSX from 'xlsx';

const MAX_WORKBOOK_BYTES = 5 * 1024 * 1024;

export interface PublicGoogleWorkbook {
  spreadsheetId: string;
  workbook: XLSX.WorkBook;
  sheetNames: string[];
}

export function extractGoogleSpreadsheetId(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.hostname !== 'docs.google.com') return null;
    return url.pathname.match(/^\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] || null;
  } catch {
    return null;
  }
}

export async function fetchPublicGoogleWorkbook(value: string): Promise<PublicGoogleWorkbook> {
  const spreadsheetId = extractGoogleSpreadsheetId(value);
  if (!spreadsheetId) throw new Error('Vui lòng nhập đúng link Google Sheet.');

  const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;
  const response = await fetch(exportUrl, {
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error('Không thể đọc Google Sheet. Hãy bật quyền “Anyone with the link – Viewer”.');
  }

  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_WORKBOOK_BYTES) throw new Error('Google Sheet vượt quá giới hạn 5 MB.');

  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAX_WORKBOOK_BYTES) throw new Error('Google Sheet vượt quá giới hạn 5 MB.');

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(Buffer.from(bytes), { type: 'buffer', cellDates: true });
  } catch {
    throw new Error('Không thể đọc workbook Google Sheet. Hãy kiểm tra quyền chia sẻ và thử lại.');
  }
  if (workbook.SheetNames.length === 0) throw new Error('Google Sheet không có worksheet nào.');

  return { spreadsheetId, workbook, sheetNames: workbook.SheetNames };
}

export function readWorksheetRows(workbook: XLSX.WorkBook, requestedName: string): {
  sheetName: string;
  rows: unknown[][];
} {
  const trimmedName = requestedName.trim();
  if (!trimmedName) throw new Error('Vui lòng chọn Sheet/Tab cần import.');

  const sheetName = workbook.SheetNames.find(name => name === trimmedName)
    || workbook.SheetNames.find(name => name.toLowerCase() === trimmedName.toLowerCase());
  if (!sheetName) {
    throw new Error(`Không tìm thấy sheet “${trimmedName}”. Các sheet có sẵn: ${workbook.SheetNames.join(', ')}`);
  }

  return {
    sheetName,
    rows: XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
      header: 1,
      defval: '',
      raw: false,
      dateNF: 'yyyy-mm-dd',
    }),
  };
}
