export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { normalizeVietnamesePhone } from '@/lib/customer-phone';

function mapStageToCustomerStatus(stage: string): string {
  switch (stage) {
    case 'Chốt đơn':
    case 'Đã mua':
      return 'Đã mua';
    case 'Thua':
    case 'Không phản hồi':
      return 'Không phản hồi';
    case 'Mới':
      return 'Mới';
    case 'Đang tư vấn':
    case 'Báo giá':
    case 'Đặt cọc':
    case 'Hẹn liên hệ':
    default:
      return 'Đang tư vấn';
  }
}

async function syncLeadToCustomer(lead: { name: string; phone?: string | null; email?: string | null; source?: string | null; stage?: string; notes?: string | null }) {
  if (!lead.phone) return;
  const normalizedPhone = normalizeVietnamesePhone(lead.phone);
  if (!normalizedPhone) return;

  const targetStatus = lead.stage ? mapStageToCustomerStatus(lead.stage) : undefined;
  
  try {
    const existing = await prisma.customer.findUnique({
      where: { normalizedPhone },
    });

    if (existing) {
      await prisma.customer.update({
        where: { id: existing.id },
        data: {
          ...(targetStatus && { status: targetStatus }),
          ...(lead.source && { source: lead.source }),
          ...(lead.notes && { notes: lead.notes }),
        },
      });
    } else {
      await prisma.customer.create({
        data: {
          name: lead.name,
          phone: normalizedPhone,
          normalizedPhone,
          email: lead.email || null,
          source: lead.source || 'Facebook',
          status: targetStatus || 'Mới',
          notes: lead.notes || null,
        },
      });
    }
  } catch (err) {
    console.error('Lead to customer sync warning:', err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const url = new URL(req.url);
    const stage = url.searchParams.get('stage')?.trim();
    const search = url.searchParams.get('q')?.trim();

    const leads = await prisma.lead.findMany({
      where: {
        ...(stage && stage !== 'all' ? { stage } : {}),
        ...(search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { email: { contains: search, mode: 'insensitive' } },
            { assignee: { contains: search, mode: 'insensitive' } },
            { nextAction: { contains: search, mode: 'insensitive' } },
            { notes: { contains: search, mode: 'insensitive' } },
            { source: { contains: search, mode: 'insensitive' } },
          ]
        } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(leads);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const data = await req.json();
    const lead = await prisma.lead.create({
      data: {
        ...data,
        value: typeof data.value === 'number' ? data.value : parseFloat(String(data.value || '0')) || 0,
      },
    });
    await syncLeadToCustomer(lead);
    return NextResponse.json(lead, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id, ...data } = await req.json();
    const lead = await prisma.lead.update({
      where: { id },
      data: {
        ...data,
        ...(data.value !== undefined ? { value: typeof data.value === 'number' ? data.value : parseFloat(String(data.value || '0')) || 0 } : {}),
      },
    });
    await syncLeadToCustomer(lead);
    return NextResponse.json(lead);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await req.json();
    await prisma.lead.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
