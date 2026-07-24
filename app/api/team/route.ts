export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const workflows = await prisma.teamWorkflow.findMany({ orderBy: { createdAt: 'asc' } });
    return NextResponse.json({ workflows: workflows ?? [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}
