export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { OrderAssetType } from '@prisma/client';

import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

function actorId(session: any): string | null {
  const id = session?.user?.id;
  return id && id !== 'superadmin' ? id : null;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const type = String(body?.type ?? '') as OrderAssetType;
    const url = String(body?.url ?? '').trim();
    if (!Object.values(OrderAssetType).includes(type)) return NextResponse.json({ error: 'Loại hình không hợp lệ.' }, { status: 400 });
    if (!url) return NextResponse.json({ error: 'Thiếu link hình.' }, { status: 400 });
    const asset = await prisma.orderAsset.create({
      data: {
        orderId: params.id,
        type,
        url,
        storagePath: String(body?.storagePath ?? '').trim() || null,
        fileName: String(body?.fileName ?? '').trim() || null,
        mimeType: String(body?.mimeType ?? '').trim() || null,
        createdById: actorId(session),
      },
    });
    return NextResponse.json({ ok: true, asset }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const assetId = String(body?.assetId ?? '').trim();
    if (!assetId) return NextResponse.json({ error: 'Thiếu assetId.' }, { status: 400 });
    const result = await prisma.orderAsset.deleteMany({ where: { id: assetId, orderId: params.id } });
    return NextResponse.json({ ok: true, deleted: result.count });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}
