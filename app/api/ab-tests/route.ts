export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const tests = await prisma.aBTest.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(tests);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
