export const dynamic = 'force-dynamic';

import { randomUUID } from 'node:crypto';

import { OrderAssetType } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function storageConfig() {
  const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'order-assets';
  if (!baseUrl || !serviceKey) throw new Error('Thiếu cấu hình Supabase Storage trên server.');
  return { baseUrl, serviceKey, bucket };
}

function storageHeaders(serviceKey: string) {
  return { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
}

async function ensurePublicBucket(config: ReturnType<typeof storageConfig>) {
  const headers = storageHeaders(config.serviceKey);
  const current = await fetch(`${config.baseUrl}/storage/v1/bucket/${encodeURIComponent(config.bucket)}`, { headers, cache: 'no-store' });
  if (current.ok) return;
  if (current.status !== 404) throw new Error(`Không kiểm tra được bucket (${current.status}).`);
  const created = await fetch(`${config.baseUrl}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: config.bucket, name: config.bucket, public: true, file_size_limit: MAX_IMAGE_BYTES, allowed_mime_types: ['image/*'] }),
  });
  if (!created.ok) throw new Error(`Không tạo được bucket (${created.status}): ${await created.text()}`);
}

function extension(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (fromName && fromName.length <= 5) return fromName;
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const form = await req.formData();
    const file = form.get('file');
    const type = String(form.get('type') ?? '') as OrderAssetType;
    if (!(file instanceof File)) return NextResponse.json({ error: 'Thiếu file ảnh.' }, { status: 400 });
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Chỉ nhận file hình ảnh.' }, { status: 400 });
    if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: 'Ảnh vượt quá giới hạn 4 MB.' }, { status: 413 });
    if (!Object.values(OrderAssetType).includes(type)) return NextResponse.json({ error: 'Loại hình không hợp lệ.' }, { status: 400 });

    const order = await prisma.order.findUnique({ where: { id: params.id }, select: { id: true, orderId: true } });
    if (!order) return NextResponse.json({ error: 'Không tìm thấy đơn hàng.' }, { status: 404 });
    const existing = await prisma.orderAsset.findFirst({ where: { orderId: order.id, type, fileName: file.name } });
    if (existing) return NextResponse.json({ ok: true, skipped: true, asset: existing });
    const config = storageConfig();
    await ensurePublicBucket(config);
    const objectPath = `${order.orderId}/${type.toLowerCase()}/${randomUUID()}.${extension(file)}`;
    const encodedPath = objectPath.split('/').map(encodeURIComponent).join('/');
    const uploaded = await fetch(`${config.baseUrl}/storage/v1/object/${encodeURIComponent(config.bucket)}/${encodedPath}`, {
      method: 'POST',
      headers: {
        ...storageHeaders(config.serviceKey),
        'Content-Type': file.type,
        'x-upsert': 'false',
      },
      body: await file.arrayBuffer(),
    });
    if (!uploaded.ok) throw new Error(`Upload Storage thất bại (${uploaded.status}): ${await uploaded.text()}`);
    const publicUrl = `${config.baseUrl}/storage/v1/object/public/${encodeURIComponent(config.bucket)}/${encodedPath}`;
    const userId = (session.user as { id?: string } | undefined)?.id;
    const asset = await prisma.orderAsset.create({
      data: {
        orderId: order.id,
        type,
        url: publicUrl,
        storagePath: objectPath,
        fileName: file.name,
        mimeType: file.type,
        createdById: userId && userId !== 'superadmin' ? userId : null,
      },
    });
    await prisma.order.update({ where: { id: order.id }, data: { hasMedia: 'Yes' } });
    return NextResponse.json({ ok: true, asset }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Lỗi upload ảnh.' }, { status: 500 });
  }
}
