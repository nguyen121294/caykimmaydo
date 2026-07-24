export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const tasks = await prisma.task.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ tasks: tasks ?? [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const checklist = Array.isArray(body?.checklist)
      ? body.checklist.map((item: any) =>
          typeof item === 'string'
            ? { text: item, done: false }
            : { text: item?.text ?? '', done: !!item?.done }
        )
      : [];

    const task = await prisma.task.create({
      data: {
        name: body?.name ?? '',
        department: body?.department ?? '',
        assignee: body?.assignee ?? null,
        orderId: body?.orderId || null,
        description: body?.description ?? null,
        startDate: body?.startDate ?? null,
        deadline: body?.deadline ?? null,
        status: body?.status ?? 'Chưa làm',
        priority: body?.priority ?? 'Trung bình',
        note: body?.note ?? null,
        checklist: checklist as any,
      },
    });

    return NextResponse.json({ ok: true, task });
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
    if (rest.assignee !== undefined) data.assignee = rest.assignee;
    if (rest.priority !== undefined) data.priority = rest.priority;
    if (rest.deadline !== undefined) data.deadline = rest.deadline;
    if (rest.checklist !== undefined) data.checklist = rest.checklist;

    const task = await prisma.task.update({ where: { id }, data });
    return NextResponse.json({ ok: true, task });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req?.url ?? 'http://localhost');
    const id = url?.searchParams?.get?.('id') ?? '';
    if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}
