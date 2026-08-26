export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { fetchPublicGoogleWorkbook } from '@/lib/google-sheet-workbook';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Không thể đọc danh sách Sheet/Tab.';
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const body: unknown = await req.json();
    const spreadsheetUrl = body && typeof body === 'object'
      ? String((body as Record<string, unknown>).spreadsheetUrl || '')
      : '';
    const { spreadsheetId, sheetNames } = await fetchPublicGoogleWorkbook(spreadsheetUrl);
    return NextResponse.json({ success: true, spreadsheetId, sheetNames });
  } catch (error: unknown) {
    const isTimeout = error instanceof Error && error.name === 'TimeoutError';
    return NextResponse.json({
      success: false,
      error: isTimeout ? 'Google Sheet phản hồi quá chậm. Vui lòng thử lại.' : errorMessage(error),
    }, { status: isTimeout ? 504 : 400 });
  }
}
