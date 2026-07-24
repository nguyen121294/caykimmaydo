export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req?.url ?? 'http://localhost');
    const type = url?.searchParams?.get?.('type') ?? '';
    const where: any = {};
    if (type) where.customerType = { contains: type };

    const [scripts, kpis] = await Promise.all([
      prisma.inboxScript.findMany({ where, orderBy: { createdAt: 'asc' } }),
      prisma.inboxKpi.findMany({ orderBy: { createdAt: 'desc' } }),
    ]);

    return NextResponse.json({ scripts: scripts ?? [], kpis: kpis ?? [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}
