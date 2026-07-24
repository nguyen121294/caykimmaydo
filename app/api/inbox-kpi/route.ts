export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const kpis = await prisma.inboxKpi.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(kpis);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
