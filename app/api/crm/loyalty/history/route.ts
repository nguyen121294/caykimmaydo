export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json({ error: 'Thiếu customerId' }, { status: 400 });
    }

    const transactions = await prisma.loyaltyTransaction.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(transactions);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi server' }, { status: 500 });
  }
}
