import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

async function checkAdminAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return token === 'superadmin_token_active';
}

export async function GET() {
  const isAuthenticated = await checkAdminAuth();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Chưa được cấp quyền SuperAdmin' }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Không thể truy vấn CSDL: ' + (error?.message || 'Lỗi hệ thống') },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const isAuthenticated = await checkAdminAuth();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Chưa được cấp quyền SuperAdmin' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, email, password, role } = body || {};

    if (!email || !password) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ Email và Mật khẩu' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email này đã tồn tại trên hệ thống' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: name || email.split('@')[0],
        email,
        password: hashedPassword,
        role: role || 'user',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Lỗi khi tạo tài khoản: ' + (error?.message || 'Lỗi CSDL') },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const isAuthenticated = await checkAdminAuth();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Chưa được cấp quyền SuperAdmin' }, { status: 401 });
  }

  try {
    const { userId, newPassword } = await req.json();

    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'Vui lòng cung cấp ID tài khoản và Mật khẩu mới' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, message: 'Đã cập nhật mật khẩu mới thành công', user: updatedUser });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Lỗi khi đổi mật khẩu: ' + (error?.message || 'Lỗi CSDL') },
      { status: 500 }
    );
  }
}
