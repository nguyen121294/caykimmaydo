import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

async function checkIsAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'admin') {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await checkIsAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Yêu cầu quyền Quản trị viên (Admin)' }, { status: 403 });
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
      { error: 'Lỗi truy vấn CSDL: ' + (error?.message || 'Lỗi không xác định') },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await checkIsAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Yêu cầu quyền Quản trị viên (Admin)' }, { status: 403 });
  }

  try {
    const { name, email, password, role } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Vui lòng nhập Email và Mật khẩu' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email này đã tồn tại trong hệ thống' }, { status: 400 });
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
  const session = await checkIsAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Yêu cầu quyền Quản trị viên (Admin)' }, { status: 403 });
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

    return NextResponse.json({ success: true, message: 'Đã đổi mật khẩu người dùng thành công', user: updatedUser });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Lỗi khi đổi mật khẩu: ' + (error?.message || 'Lỗi CSDL') },
      { status: 500 }
    );
  }
}
