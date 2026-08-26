export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { normalizeVietnamesePhone } from '@/lib/customer-phone';

function getPhoneData(phone: unknown) {
  if (!phone) return { phone: null, normalizedPhone: null };
  const normalizedPhone = normalizeVietnamesePhone(phone);
  if (!normalizedPhone) throw new Error('Số điện thoại Việt Nam không hợp lệ');
  return { phone: normalizedPhone, normalizedPhone };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const url = new URL(req.url);
    const search = url.searchParams.get('q')?.trim() ?? '';
    const id = url.searchParams.get('id')?.trim() ?? '';
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 200), 1), 500);
    const customers = await prisma.customer.findMany({
      where: id ? { id } : search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { normalizedPhone: { contains: search } },
        ],
      } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return NextResponse.json(customers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const data = await req.json();
    const customer = await prisma.customer.create({
      data: { ...data, ...getPhoneData(data.phone) },
    });
    return NextResponse.json(customer, { status: 201 });
  } catch (error: any) {
    const isDuplicate = error?.code === 'P2002';
    return NextResponse.json(
      { error: isDuplicate ? 'Số điện thoại đã tồn tại trong CRM' : error.message },
      { status: isDuplicate ? 409 : 400 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id, ...data } = await req.json();
    const phoneData = 'phone' in data ? getPhoneData(data.phone) : {};
    const customer = await prisma.customer.update({
      where: { id },
      data: { ...data, ...phoneData },
    });
    return NextResponse.json(customer);
  } catch (error: any) {
    const isDuplicate = error?.code === 'P2002';
    return NextResponse.json(
      { error: isDuplicate ? 'Số điện thoại đã tồn tại trong CRM' : error.message },
      { status: isDuplicate ? 409 : 400 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await req.json();
    await prisma.customer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
