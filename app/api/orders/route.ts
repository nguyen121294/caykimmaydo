export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req?.url ?? 'http://localhost');
    const status = url?.searchParams?.get?.('status') ?? '';
    const where: any = {};
    if (status) where.status = status;

    const [orders, checklists] = await Promise.all([
      prisma.order.findMany({ where, orderBy: { createdAt: 'desc' } }),
      prisma.tailorChecklist.findMany({ orderBy: { createdAt: 'desc' } }),
    ]);

    return NextResponse.json({ orders: orders ?? [], checklists: checklists ?? [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderId = body?.orderId || `DH-${Date.now()}`;

    const order = await prisma.order.create({
      data: {
        orderId,
        customerName: body?.customerName ?? '',
        phone: body?.phone ?? null,
        product: body?.product ?? '',
        productType: body?.productType ?? null,
        quantity: Number(body?.quantity ?? 1),
        fabricType: body?.fabricType ?? null,
        tailorName: body?.tailorName ?? null,
        orderDate: body?.orderDate ?? null,
        tryDate: body?.tryDate ?? null,
        deliveryDate: body?.deliveryDate ?? null,
        expectedDate: body?.deliveryDate ?? null,
        total: Number(body?.total ?? 0),
        deposit: Number(body?.deposit ?? 0),
        price: body?.total ? String(body.total) : null,
        department: body?.department ?? null,
        status: body?.status ?? 'Mới',
        notes: body?.note ?? body?.notes ?? null,
        source: body?.source ?? 'Khác',
      },
    });

    return NextResponse.json({ ok: true, order });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...rest } = body ?? {};
    if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });

    const data: any = {};
    if (rest.status !== undefined) data.status = rest.status;
    if (rest.tailorName !== undefined) data.tailorName = rest.tailorName;
    if (rest.notes !== undefined) data.notes = rest.notes;
    if (rest.deposit !== undefined) data.deposit = Number(rest.deposit);
    if (rest.total !== undefined) data.total = Number(rest.total);

    const order = await prisma.order.update({ where: { id }, data });
    return NextResponse.json({ ok: true, order });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}
