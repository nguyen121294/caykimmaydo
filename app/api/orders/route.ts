export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { Prisma } from '@prisma/client';

import { authOptions } from '@/lib/auth-options';
import { getOrderPhonePlan } from '@/lib/order-customer';
import { prisma } from '@/lib/prisma';

function numberValue(value: unknown, fallback = 0): number {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalText(value: unknown): string | null {
  const result = String(value ?? '').trim();
  return result || null;
}

function sessionUserId(session: any): string | null {
  const id = (session?.user as { id?: string } | undefined)?.id;
  return id && id !== 'superadmin' ? id : null;
}

async function refreshCustomerSummary(tx: Prisma.TransactionClient, customerId: string | null | undefined) {
  if (!customerId) return;
  const [summary, latest] = await Promise.all([
    tx.order.aggregate({ where: { customerId }, _count: { _all: true }, _sum: { total: true } }),
    tx.order.findFirst({ where: { customerId }, orderBy: { createdAt: 'desc' }, select: { orderId: true, orderDate: true } }),
  ]);
  await tx.customer.update({
    where: { id: customerId },
    data: {
      totalOrders: summary._count._all,
      totalSpent: summary._sum.total ?? 0,
      lastOrder: latest?.orderId ?? null,
      lastPurchaseDate: latest?.orderDate ?? null,
      status: summary._count._all > 0 ? 'Đã mua' : undefined,
    },
  });
}

async function resolveCustomer(
  tx: Prisma.TransactionClient,
  body: Record<string, unknown>,
): Promise<{ customerId: string | null; customerName: string; phone: string; needsCustomerPhone: boolean }> {
  const selectedCustomerId = optionalText(body.customerId);
  if (selectedCustomerId) {
    const customer = await tx.customer.findUnique({ where: { id: selectedCustomerId } });
    if (!customer) throw new Error('Khách hàng CRM đã chọn không còn tồn tại.');
    const phonePlan = getOrderPhonePlan(customer.phone);
    return { customerId: customer.id, customerName: customer.name, phone: phonePlan.phone, needsCustomerPhone: phonePlan.needsCustomerPhone };
  }

  const customerName = optionalText(body.customerName) ?? '';
  const phonePlan = getOrderPhonePlan(body.phone);
  if (!phonePlan.shouldLinkCustomer || !phonePlan.normalizedPhone) {
    return { customerId: null, customerName, phone: phonePlan.phone, needsCustomerPhone: true };
  }

  const existing = await tx.customer.findUnique({ where: { normalizedPhone: phonePlan.normalizedPhone } });
  const customer = existing ?? await tx.customer.create({
    data: {
      name: customerName,
      phone: phonePlan.phone,
      normalizedPhone: phonePlan.normalizedPhone,
      address: optionalText(body.deliveryAddress),
      source: optionalText(body.source) ?? 'Khác',
      status: 'Đã mua',
    },
  });
  return { customerId: customer.id, customerName: customer.name, phone: phonePlan.phone, needsCustomerPhone: false };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const url = new URL(req.url);
    const status = url.searchParams.get('status') ?? '';
    const search = url.searchParams.get('q')?.trim() ?? '';
    const missingPhone = url.searchParams.get('missingPhone') === 'true';
    const where: Prisma.OrderWhereInput = {
      ...(status ? { status } : {}),
      ...(missingPhone ? { needsCustomerPhone: true } : {}),
      ...(search ? { OR: [
        { orderId: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ] } : {}),
    };

    const [orders, checklists] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          salesOwner: { select: { id: true, name: true, email: true } },
          assets: true,
        },
      }),
      prisma.tailorChecklist.findMany({ orderBy: { createdAt: 'desc' } }),
    ]);
    return NextResponse.json({ orders, checklists });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json() as Record<string, unknown>;
    if (!optionalText(body.customerName) && !optionalText(body.customerId)) return NextResponse.json({ error: 'Thiếu tên hoặc khách hàng CRM.' }, { status: 400 });
    if (!optionalText(body.product)) return NextResponse.json({ error: 'Thiếu sản phẩm.' }, { status: 400 });
    if (numberValue(body.deposit) > numberValue(body.total)) return NextResponse.json({ error: 'Tiền cọc không được lớn hơn tổng giá trị.' }, { status: 400 });

    const actorId = sessionUserId(session);
    const allowedAssetTypes = new Set(['PRODUCT', 'DEPOSIT_BILL', 'BALANCE_BILL', 'FABRIC_BILL']);
    const assetCreates = Array.isArray(body.assets) ? body.assets.flatMap(raw => {
      const item = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
      const type = String(item.type ?? '');
      const url = optionalText(item.url);
      if (!url || !allowedAssetTypes.has(type)) return [];
      return [{ type: type as 'PRODUCT' | 'DEPOSIT_BILL' | 'BALANCE_BILL' | 'FABRIC_BILL', url, fileName: optionalText(item.fileName), mimeType: optionalText(item.mimeType), createdById: actorId }];
    }) : [];
    const order = await prisma.$transaction(async tx => {
      const customer = await resolveCustomer(tx, body);
      const orderDate = optionalText(body.orderDate);
      const expectedDate = optionalText(body.expectedDate) ?? optionalText(body.deliveryDate);
      const created = await tx.order.create({
        data: {
          orderId: optionalText(body.orderId) ?? `DH-${Date.now()}`,
          ...customer,
          product: optionalText(body.product) ?? 'Sản phẩm may đo',
          productType: optionalText(body.productType),
          quantity: Math.max(1, Math.round(numberValue(body.quantity, 1))),
          fabricType: optionalText(body.fabricType),
          tailorName: optionalText(body.tailorName),
          orderDate,
          tryDate: optionalText(body.tryDate),
          deliveryDate: expectedDate,
          expectedDate,
          deliveryAddress: optionalText(body.deliveryAddress),
          total: numberValue(body.total),
          deposit: numberValue(body.deposit),
          listPrice: numberValue(body.listPrice, numberValue(body.total)),
          discountAmount: numberValue(body.discountAmount),
          paymentMethod: optionalText(body.paymentMethod),
          paymentAccount: optionalText(body.paymentAccount),
          tailorCost: numberValue(body.tailorCost),
          fabricCost: numberValue(body.fabricCost),
          shippingFee: numberValue(body.shippingFee),
          price: body.total !== undefined ? String(body.total) : null,
          department: optionalText(body.department),
          status: optionalText(body.status) ?? 'Mới nhận',
          notes: optionalText(body.note) ?? optionalText(body.notes),
          source: optionalText(body.source) ?? 'Khác',
          salesOwnerId: optionalText(body.salesOwnerId) ?? actorId,
          createdById: actorId,
          updatedById: actorId,
          importBatchId: optionalText(body.importBatchId),
          assets: assetCreates.length ? { create: assetCreates } : undefined,
        },
        include: { customer: true, salesOwner: true, assets: true },
      });
      await refreshCustomerSummary(tx, customer.customerId);
      return created;
    });
    return NextResponse.json({ ok: true, order }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: message.includes('không còn tồn tại') ? 409 : 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json() as Record<string, unknown>;
    const id = optionalText(body.id);
    if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });
    const actorId = sessionUserId(session);

    const order = await prisma.$transaction(async tx => {
      const previous = await tx.order.findUnique({ where: { id } });
      if (!previous) throw new Error('Không tìm thấy đơn hàng.');
      const shouldResolveCustomer = 'phone' in body || 'customerId' in body;
      const customer = shouldResolveCustomer
        ? await resolveCustomer(tx, { ...body, customerName: body.customerName ?? previous.customerName })
        : null;
      const data: Prisma.OrderUpdateInput = {
        ...(customer ? {
          customer: customer.customerId ? { connect: { id: customer.customerId } } : { disconnect: true },
          customerName: customer.customerName,
          phone: customer.phone,
          needsCustomerPhone: customer.needsCustomerPhone,
        } : {}),
        ...(body.customerName !== undefined && !customer ? { customerName: String(body.customerName) } : {}),
        ...(body.status !== undefined ? { status: String(body.status) } : {}),
        ...(body.tailorName !== undefined ? { tailorName: optionalText(body.tailorName) } : {}),
        ...(body.notes !== undefined ? { notes: optionalText(body.notes) } : {}),
        ...(body.deposit !== undefined ? { deposit: numberValue(body.deposit) } : {}),
        ...(body.total !== undefined ? { total: numberValue(body.total) } : {}),
        ...(body.expectedDate !== undefined ? { expectedDate: optionalText(body.expectedDate), deliveryDate: optionalText(body.expectedDate) } : {}),
        ...(body.salesOwnerId !== undefined ? { salesOwner: optionalText(body.salesOwnerId) ? { connect: { id: String(body.salesOwnerId) } } : { disconnect: true } } : {}),
        ...(actorId ? { updatedBy: { connect: { id: actorId } } } : {}),
      };
      const updated = await tx.order.update({ where: { id }, data, include: { customer: true, salesOwner: true, assets: true } });
      await refreshCustomerSummary(tx, previous.customerId);
      if (updated.customerId !== previous.customerId) await refreshCustomerSummary(tx, updated.customerId);
      return updated;
    });
    return NextResponse.json({ ok: true, order });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json() as Record<string, unknown>;
    const id = optionalText(body.id);
    if (!id) return NextResponse.json({ error: 'Thiếu id đơn hàng' }, { status: 400 });

    await prisma.$transaction(async tx => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) throw new Error('Không tìm thấy đơn hàng');
      await tx.orderAsset.deleteMany({ where: { orderId: id } });
      await tx.order.delete({ where: { id } });
      await refreshCustomerSummary(tx, order.customerId);
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}

