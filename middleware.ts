import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req: any) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }: any) => !!token,
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/analytics/:path*',
    '/content/:path*',
    '/orders/:path*',
    '/inbox/:path*',
    '/team/:path*',
    '/automation/:path*',
    '/settings/:path*',
    '/resources/:path*',
    '/crm/:path*',
    '/sales/:path*',
    '/marketing/:path*',
    '/manychat/:path*',
    '/finance/:path*',
    '/import-export/:path*',
    '/connections/:path*',
  ],
};
