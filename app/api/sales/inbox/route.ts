export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getSalesInbox } from '@/lib/sales-inbox';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    return NextResponse.json(await getSalesInbox());
  } catch {
    return NextResponse.json(
      { error: 'Không thể tải hộp thư đa nền tảng lúc này.' },
      { status: 500 },
    );
  }
}
