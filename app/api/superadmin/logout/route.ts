import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Đã đăng xuất SuperAdmin' });
  response.cookies.delete('admin_session');
  return response;
}
