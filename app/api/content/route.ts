export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req?.url ?? 'http://localhost');
    const stage = url?.searchParams?.get?.('stage') ?? '';
    const pillar = url?.searchParams?.get?.('pillar') ?? '';
    const status = url?.searchParams?.get?.('status') ?? '';

    const where: any = {};
    if (stage) where.funnelStage = stage;
    if (pillar) where.contentType = { contains: pillar };
    if (status) where.status = status;

    const [scripts, calendar] = await Promise.all([
      prisma.videoScript.findMany({ where, orderBy: { scriptId: 'asc' } }),
      prisma.contentCalendar.findMany({ orderBy: { createdAt: 'asc' } }),
    ]);

    return NextResponse.json({ scripts: scripts ?? [], calendar: calendar ?? [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { scriptId, status } = body ?? {};
    if (!scriptId) return NextResponse.json({ error: 'Missing scriptId' }, { status: 400 });
    const updated = await prisma.videoScript.update({
      where: { scriptId },
      data: { status: status ?? 'Chưa Dùng' },
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}
