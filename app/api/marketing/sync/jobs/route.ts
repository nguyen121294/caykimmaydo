export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });

  const groupId = req.nextUrl.searchParams.get('groupId');
  const jobId = req.nextUrl.searchParams.get('jobId');
  if (!groupId && !jobId) {
    return NextResponse.json({ error: 'Thiếu groupId hoặc jobId.' }, { status: 400 });
  }

  const jobs = await prisma.syncJob.findMany({
    where: groupId ? { groupId } : { id: jobId || undefined },
    orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      groupId: true,
      platform: true,
      days: true,
      status: true,
      stage: true,
      recordsFetched: true,
      recordsSaved: true,
      attempts: true,
      error: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ jobs });
}
