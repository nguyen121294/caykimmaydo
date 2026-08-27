export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { prisma } from '@/lib/prisma';
import { parseTaskViewBuffer } from '@/lib/task-import';

export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ tasks: tasks ?? [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi tải danh sách công việc' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Action: Sync from local docs/taskview.xlsx file
    if (body?.action === 'sync-file') {
      const filePath = path.join(process.cwd(), 'docs', 'taskview.xlsx');
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: 'Không tìm thấy file docs/taskview.xlsx' }, { status: 404 });
      }
      const buffer = fs.readFileSync(filePath);
      const items = parseTaskViewBuffer(buffer);
      if (items.length === 0) {
        return NextResponse.json({ error: 'File Excel không có dữ liệu hợp lệ' }, { status: 400 });
      }

      await prisma.task.deleteMany({});
      const dataToInsert = items.map((t) => ({
        name: t.name,
        department: t.department,
        assignee: t.assignee,
        description: t.description,
        deadline: t.deadline,
        status: t.status,
        priority: 'Trung bình',
        note: t.note,
        checklist: t.checklist as any,
      }));

      const res = await prisma.task.createMany({ data: dataToInsert });
      return NextResponse.json({ ok: true, count: res.count, message: `Đã đồng bộ ${res.count} công việc` });
    }

    // 2. Action: Bulk import from uploaded items
    if (body?.action === 'import' && Array.isArray(body?.items)) {
      const dataToInsert = body.items.map((t: any) => ({
        name: String(t.name || t.department || 'Công việc mới').trim(),
        department: String(t.department || 'Tổng hợp').trim(),
        assignee: t.assignee ? String(t.assignee).trim() : null,
        description: t.description ? String(t.description).trim() : null,
        deadline: t.deadline ? String(t.deadline).trim() : null,
        status: t.status || 'Giao việc',
        priority: t.priority || 'Trung bình',
        note: t.note ? String(t.note).trim() : null,
        checklist: Array.isArray(t.checklist) ? t.checklist : [],
      }));

      if (body.overwrite) {
        await prisma.task.deleteMany({});
      }

      const res = await prisma.task.createMany({ data: dataToInsert });
      return NextResponse.json({ ok: true, count: res.count, message: `Đã nạp ${res.count} công việc` });
    }

    // 3. Standard Single Task Create
    const checklist = Array.isArray(body?.checklist)
      ? body.checklist.map((item: any) =>
          typeof item === 'string'
            ? { text: item, done: false }
            : { text: item?.text ?? '', done: !!item?.done, url: item?.url }
        )
      : [];

    const task = await prisma.task.create({
      data: {
        name: body?.name ?? '',
        department: body?.department ?? 'Tổng hợp',
        assignee: body?.assignee ?? null,
        orderId: body?.orderId || null,
        description: body?.description ?? null,
        startDate: body?.startDate ?? null,
        deadline: body?.deadline ?? null,
        status: body?.status ?? 'Giao việc',
        priority: body?.priority ?? 'Trung bình',
        note: body?.note ?? null,
        checklist: checklist as any,
      },
    });

    return NextResponse.json({ ok: true, task });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi xử lý task' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...rest } = body ?? {};
    if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });

    const data: any = {};
    if (rest.name !== undefined) data.name = rest.name;
    if (rest.department !== undefined) data.department = rest.department;
    if (rest.description !== undefined) data.description = rest.description;
    if (rest.status !== undefined) data.status = rest.status;
    if (rest.assignee !== undefined) data.assignee = rest.assignee;
    if (rest.priority !== undefined) data.priority = rest.priority;
    if (rest.deadline !== undefined) data.deadline = rest.deadline;
    if (rest.note !== undefined) data.note = rest.note;
    if (rest.checklist !== undefined) data.checklist = rest.checklist;

    const task = await prisma.task.update({ where: { id }, data });
    return NextResponse.json({ ok: true, task });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi cập nhật task' }, { status: 500 });
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
    return NextResponse.json({ error: error?.message ?? 'Lỗi xóa task' }, { status: 500 });
  }
}
