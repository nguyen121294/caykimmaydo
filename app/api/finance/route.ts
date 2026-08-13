export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';
import {
  DEFAULT_FINANCE_ROWS,
  emptyMonthValues,
  isFinanceRowKind,
  normalizeMonthValues,
  type FinanceRowKind,
} from '@/lib/finance-ledger';

type AdminSession = {
  user: { id?: string; name?: string | null; email?: string | null; role?: string };
};

async function requireAdmin() {
  const session = (await getServerSession(authOptions)) as AdminSession | null;
  if (!session?.user || session.user.role !== 'admin') return null;
  return session;
}

function auditActor(session: AdminSession) {
  return {
    userId: session.user.id && session.user.id !== 'superadmin' ? session.user.id : null,
    userName: session.user.name || 'Admin',
    userEmail: session.user.email || null,
  };
}

async function createDefaultLedger(year: number, session: AdminSession) {
  const existing = await prisma.financeLedger.findUnique({ where: { year } });
  if (existing) return existing;

  return prisma.$transaction(
    async (tx) => {
      const ledger = await tx.financeLedger.create({
        data: {
          year,
          archived: year < new Date().getFullYear(),
          months: { create: Array.from({ length: 12 }, (_, index) => ({ month: index + 1 })) },
        },
      });
      const parents = new Map<string, string>();
      for (const [sortOrder, row] of DEFAULT_FINANCE_ROWS.entries()) {
        const created = await tx.financeLedgerRow.create({
          data: {
            ledgerId: ledger.id,
            parentId: row.parentLabel ? parents.get(row.parentLabel) : null,
            label: row.label,
            kind: row.kind,
            sortOrder,
            values: emptyMonthValues(),
          },
        });
        if (row.kind === 'GROUP') parents.set(row.label, created.id);
      }
      await tx.financeAuditLog.create({
        data: { ledgerId: ledger.id, action: 'CREATE_YEAR', after: { year }, ...auditActor(session) },
      });
      return ledger;
    },
    { timeout: 30000, maxWait: 10000 },
  );
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: 'Chỉ admin được truy cập' }, { status: 403 });

    const requestedYear = Number(req.nextUrl.searchParams.get('year')) || new Date().getFullYear();
    const ledger = await createDefaultLedger(requestedYear, session);
    const [years, data, logs] = await Promise.all([
      prisma.financeLedger.findMany({ orderBy: { year: 'desc' }, select: { year: true, archived: true } }),
      prisma.financeLedger.findUnique({
        where: { id: ledger.id },
        include: {
          rows: { orderBy: { sortOrder: 'asc' } },
          months: { orderBy: { month: 'asc' } },
        },
      }),
      prisma.financeAuditLog.findMany({
        where: { ledgerId: ledger.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: { id: true, action: true, field: true, before: true, after: true, userName: true, userEmail: true, createdAt: true, row: { select: { label: true } } },
      }),
    ]);
    return NextResponse.json({ ...data, years, logs });
  } catch (error) {
    console.error('Finance ledger GET failed:', error);
    return NextResponse.json({ error: 'Không thể tải sổ tài chính. Hãy kiểm tra database migration.' }, { status: 500 });
  }
}

async function handlePost(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Chỉ admin được chỉnh sửa' }, { status: 403 });
  const body = await req.json();
  const action = String(body.action || '');

  if (action === 'CREATE_YEAR') {
    const year = Number(body.year);
    if (!Number.isInteger(year) || year < 2020 || year > 2100) return NextResponse.json({ error: 'Năm không hợp lệ' }, { status: 400 });
    const ledger = await createDefaultLedger(year, session);
    return NextResponse.json(ledger, { status: 201 });
  }

  const ledger = await prisma.financeLedger.findUnique({ where: { id: String(body.ledgerId || '') } });
  if (!ledger) return NextResponse.json({ error: 'Không tìm thấy sổ tài chính' }, { status: 404 });

  if (action === 'ADD_ROW') {
    const parentId = body.parentId ? String(body.parentId) : null;
    const parent = parentId ? await prisma.financeLedgerRow.findFirst({ where: { id: parentId, ledgerId: ledger.id, kind: 'GROUP' } }) : null;
    if (parentId && !parent) return NextResponse.json({ error: 'Nhóm cha không hợp lệ' }, { status: 400 });
    const label = String(body.label || '').trim();
    if (!label) return NextResponse.json({ error: 'Tên dòng không được trống' }, { status: 400 });
    const max = await prisma.financeLedgerRow.aggregate({ where: { ledgerId: ledger.id }, _max: { sortOrder: true } });
    const row = await prisma.financeLedgerRow.create({
      data: { ledgerId: ledger.id, parentId, label, kind: 'DETAIL', sortOrder: (max._max.sortOrder ?? 0) + 1, values: emptyMonthValues() },
    });
    await prisma.financeAuditLog.create({ data: { ledgerId: ledger.id, rowId: row.id, action: 'ADD_ROW', after: { label, parentId }, ...auditActor(session) } });
    return NextResponse.json(row, { status: 201 });
  }

  if (action === 'IMPORT') {
    if (!Array.isArray(body.rows)) return NextResponse.json({ error: 'Dữ liệu import không hợp lệ' }, { status: 400 });
    const rows = body.rows.slice(0, 200).map((row: any, index: number) => ({
      label: String(row.label || '').trim(),
      kind: isFinanceRowKind(row.kind) ? row.kind : 'DETAIL',
      parentLabel: row.parentLabel ? String(row.parentLabel).trim() : null,
      values: Object.fromEntries(Object.entries(row.values || {}).filter(([month, value]) => {
        const numericMonth = Number(month);
        return Number.isInteger(numericMonth) && numericMonth >= 1 && numericMonth <= 12 && Number.isFinite(Number(value));
      }).map(([month, value]) => [month, Number(value)])),
      sortOrder: index,
    })).filter((row: any) => row.label);
    if (!rows.length) return NextResponse.json({ error: 'Template không có dòng dữ liệu' }, { status: 400 });

    const existingRows = await prisma.financeLedgerRow.findMany({ where: { ledgerId: ledger.id } });
    const existingByLabel = new Map(existingRows.map((row) => [row.label.trim().toLocaleUpperCase('vi'), row]));
    const rowIds = new Map<string, string>(rows.map((row: any): [string, string] => {
      const key = row.label.toLocaleUpperCase('vi');
      return [key, existingByLabel.get(key)?.id || randomUUID()];
    }));
    const operations = rows.map((row: any) => {
      const key = row.label.toLocaleUpperCase('vi');
      const existing = existingByLabel.get(key);
      const parentId = row.parentLabel ? rowIds.get(row.parentLabel.toLocaleUpperCase('vi')) || null : null;
      const values = { ...normalizeMonthValues(existing?.values), ...row.values };
      return existing
        ? prisma.financeLedgerRow.update({ where: { id: existing.id }, data: { parentId, kind: row.kind, sortOrder: row.sortOrder, values } })
        : prisma.financeLedgerRow.create({ data: { id: rowIds.get(key), ledgerId: ledger.id, parentId, label: row.label, kind: row.kind, sortOrder: row.sortOrder, values } });
    });
    await prisma.$transaction([
      ...operations,
      prisma.financeAuditLog.create({ data: { ledgerId: ledger.id, action: 'IMPORT', after: { rowCount: rows.length, fileName: String(body.fileName || '') }, ...auditActor(session) } }),
    ]);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Thao tác không được hỗ trợ' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  try {
    return await handlePost(req);
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : null;
    console.error('Finance ledger POST failed:', error);
    return NextResponse.json({
      error: code === 'P2028'
        ? 'Kết nối database đã đóng transaction khi import. Vui lòng thử lại.'
        : `Không thể import dữ liệu${code ? ` (${code})` : ''}`,
    }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Chỉ admin được chỉnh sửa' }, { status: 403 });
  const body = await req.json();
  const action = String(body.action || '');

  if (action === 'MONTH_STATUS') {
    const ledgerId = String(body.ledgerId || '');
    const month = Number(body.month);
    if (!Number.isInteger(month) || month < 1 || month > 12) return NextResponse.json({ error: 'Tháng không hợp lệ' }, { status: 400 });
    const isClosed = Boolean(body.isClosed);
    const status = await prisma.financeMonthStatus.upsert({
      where: { ledgerId_month: { ledgerId, month } },
      update: { isClosed, closedAt: isClosed ? new Date() : null, closedBy: isClosed ? session.user.name || session.user.email || 'Admin' : null },
      create: { ledgerId, month, isClosed, closedAt: isClosed ? new Date() : null, closedBy: isClosed ? session.user.name || session.user.email || 'Admin' : null },
    });
    await prisma.financeAuditLog.create({ data: { ledgerId, action: isClosed ? 'CLOSE_MONTH' : 'REOPEN_MONTH', field: `month.${month}`, after: { isClosed }, ...auditActor(session) } });
    return NextResponse.json(status);
  }

  const row = await prisma.financeLedgerRow.findUnique({ where: { id: String(body.rowId || '') } });
  if (!row) return NextResponse.json({ error: 'Không tìm thấy dòng' }, { status: 404 });

  if (action === 'UPDATE_CELL') {
    if (row.kind !== 'DETAIL' && row.kind !== 'REVENUE') return NextResponse.json({ error: 'Dòng tổng được tính tự động' }, { status: 400 });
    const month = Number(body.month);
    const amount = Number(body.amount);
    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isFinite(amount)) return NextResponse.json({ error: 'Giá trị không hợp lệ' }, { status: 400 });
    const beforeValues = normalizeMonthValues(row.values);
    const afterValues = { ...beforeValues, [String(month)]: amount };
    const updated = await prisma.financeLedgerRow.update({ where: { id: row.id }, data: { values: afterValues } });
    await prisma.financeAuditLog.create({ data: { ledgerId: row.ledgerId, rowId: row.id, action: 'UPDATE_CELL', field: `month.${month}`, before: beforeValues[String(month)], after: amount, ...auditActor(session) } });
    return NextResponse.json(updated);
  }

  if (action === 'RENAME_ROW') {
    const label = String(body.label || '').trim();
    if (!label) return NextResponse.json({ error: 'Tên dòng không được trống' }, { status: 400 });
    const updated = await prisma.financeLedgerRow.update({ where: { id: row.id }, data: { label } });
    await prisma.financeAuditLog.create({ data: { ledgerId: row.ledgerId, rowId: row.id, action: 'RENAME_ROW', field: 'label', before: row.label, after: label, ...auditActor(session) } });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: 'Thao tác không được hỗ trợ' }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Chỉ admin được chỉnh sửa' }, { status: 403 });
  const { rowId } = await req.json();
  const row = await prisma.financeLedgerRow.findUnique({ where: { id: String(rowId || '') } });
  if (!row || row.kind !== 'DETAIL') return NextResponse.json({ error: 'Chỉ có thể xóa dòng thành phần' }, { status: 400 });
  await prisma.$transaction([
    prisma.financeAuditLog.create({ data: { ledgerId: row.ledgerId, action: 'DELETE_ROW', before: { label: row.label, values: row.values }, ...auditActor(session) } }),
    prisma.financeLedgerRow.delete({ where: { id: row.id } }),
  ]);
  return NextResponse.json({ success: true });
}
