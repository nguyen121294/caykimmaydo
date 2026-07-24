export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const { currentPassword, newPassword } = body ?? {};
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: (session?.user as any)?.email ?? '' } });
    if (!user?.password) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Mật khẩu hiện tại không đúng' }, { status: 400 });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}
