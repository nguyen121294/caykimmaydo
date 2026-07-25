import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    const expectedEmail = process.env.SUPERADMIN_EMAIL || 'admin@maydo.vn';
    const expectedPassword = process.env.SUPERADMIN_PASSWORD || 'admin123';

    if (!email || !password || email !== expectedEmail || password !== expectedPassword) {
      return NextResponse.json({ error: 'Thông tin xác thực SuperAdmin không chính xác' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true, message: 'Xác thực SuperAdmin thành công' });

    response.cookies.set({
      name: 'admin_session',
      value: 'superadmin_token_active',
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 8, // 8 hours
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi xử lý yêu cầu đăng nhập' }, { status: 500 });
  }
}
