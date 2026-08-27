export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [leads, customers] = await Promise.all([
      prisma.lead.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.customer.findMany({ orderBy: { createdAt: 'desc' } }),
    ]);

    const leadItems = leads.map(l => ({
      id: l.id,
      type: 'LEAD' as const,
      name: l.name,
      phone: l.phone,
      email: l.email,
      source: l.source,
      contactAccount: null,
      address: null,
      estimatedValue: l.value || 0,
      totalOrders: 0,
      loyaltyTier: null,
      statusOrStage: l.stage,
      lastCareOrPurchaseDate: null,
      nextDate: l.nextDate,
      nextAction: l.nextAction,
      noCare: false,
      notes: l.notes,
      assignee: l.assignee,
      createdAt: l.createdAt.toISOString(),
    }));

    const customerItems = customers.map(c => ({
      id: c.id,
      type: 'CUSTOMER' as const,
      name: c.name,
      phone: c.phone,
      email: c.email,
      source: c.source,
      contactAccount: c.contactAccount,
      address: c.address,
      estimatedValue: c.totalSpent || 0,
      totalOrders: c.totalOrders || 0,
      loyaltyTier: c.loyaltyTier || 'New',
      statusOrStage: c.status,
      lastCareOrPurchaseDate: c.lastCareDate || c.lastPurchaseDate,
      nextDate: c.nextCareDate,
      nextAction: c.nextCareAction,
      noCare: c.noCare,
      notes: c.notes,
      assignee: null,
      createdAt: c.createdAt.toISOString(),
    }));

    return NextResponse.json({
      items: [...leadItems, ...customerItems],
      totalLeads: leadItems.length,
      totalCustomers: customerItems.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { id, type, nextDate, nextAction, noCare, notes, statusOrStage } = body;

    if (!id || !type) {
      return NextResponse.json({ error: 'Thiếu id hoặc type' }, { status: 400 });
    }

    if (type === 'LEAD') {
      const updated = await prisma.lead.update({
        where: { id },
        data: {
          ...(nextDate !== undefined ? { nextDate } : {}),
          ...(nextAction !== undefined ? { nextAction } : {}),
          ...(notes !== undefined ? { notes } : {}),
          ...(statusOrStage !== undefined ? { stage: statusOrStage } : {}),
        },
      });
      return NextResponse.json({ success: true, item: updated });
    } else {
      const updated = await prisma.customer.update({
        where: { id },
        data: {
          ...(nextDate !== undefined ? { nextCareDate: nextDate } : {}),
          ...(nextAction !== undefined ? { nextCareAction: nextAction } : {}),
          ...(noCare !== undefined ? { noCare: Boolean(noCare) } : {}),
          ...(notes !== undefined ? { notes } : {}),
          ...(statusOrStage !== undefined ? { status: statusOrStage } : {}),
        },
      });
      return NextResponse.json({ success: true, item: updated });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
