export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name } = body ?? {};
    if (!email || !password) {
      return NextResponse.json({ error: 'Email và mật khẩu là bắt buộc' }, { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email đã tồn tại' }, { status: 400 });
    }
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, password: hashed, name: name ?? email?.split('@')?.[0] ?? 'User', role: 'user' },
    });
    return NextResponse.json({ id: user?.id, email: user?.email, name: user?.name });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi server' }, { status: 500 });
  }
}
