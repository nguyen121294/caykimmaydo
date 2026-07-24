export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

// Deprecated: chuyển sang /api/marketing/sync/meta
export async function POST() {
  return NextResponse.json(
    { error: 'Endpoint này đã chuyển sang /api/marketing/sync/meta. Vui lòng dùng endpoint mới.' },
    { status: 301 }
  );
}
