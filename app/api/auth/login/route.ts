export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body ?? {};
    if (!email || !password) {
      return NextResponse.json({ error: 'Email và mật khẩu là bắt buộc' }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user?.password) {
      return NextResponse.json({ error: 'Thông tin đăng nhập không đúng' }, { status: 401 });
    }
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Thông tin đăng nhập không đúng' }, { status: 401 });
    }
    return NextResponse.json({ id: user?.id, email: user?.email, name: user?.name, role: user?.role });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi server' }, { status: 500 });
  }
}
