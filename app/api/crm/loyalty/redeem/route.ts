export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

const REDEEM_OPTIONS: Record<number, number> = {
  100: 50000,
  200: 120000,
  500: 350000,
};

function calculateTier(points: number): string {
  if (points >= 700) return 'VIP';
  if (points >= 300) return 'Gold';
  if (points >= 100) return 'Silver';
  return 'New';
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { customerId, points } = await req.json();

    if (!customerId || !points) {
      return NextResponse.json({
        success: false,
        error: 'Thiếu customerId hoặc số điểm',
      }, { status: 400 });
    }

    const redeemPoints = Number(points);
    const discount = REDEEM_OPTIONS[redeemPoints];
    if (!discount) {
      return NextResponse.json({
        success: false,
        error: `Số điểm không hợp lệ. Chọn: ${Object.keys(REDEEM_OPTIONS).join(', ')} điểm.`,
      }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return NextResponse.json({ success: false, error: 'Khách hàng không tồn tại' }, { status: 404 });
    }

    if (customer.loyaltyPoints < redeemPoints) {
      return NextResponse.json({
        success: false,
        error: `Không đủ điểm. Hiện có ${customer.loyaltyPoints} điểm, cần ${redeemPoints} điểm.`,
      }, { status: 400 });
    }

    // Trừ điểm
    await prisma.loyaltyTransaction.create({
      data: {
        customerId,
        type: 'redeem',
        points: -redeemPoints,
        amount: discount,
        description: `Đổi ${redeemPoints} điểm → Voucher giảm ${discount.toLocaleString()}đ`,
      },
    });

    const newPoints = customer.loyaltyPoints - redeemPoints;
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        loyaltyPoints: newPoints,
        loyaltyTier: calculateTier(newPoints),
      },
    });

    return NextResponse.json({
      success: true,
      pointsRedeemed: redeemPoints,
      discount,
      remainingPoints: newPoints,
      tier: calculateTier(newPoints),
      message: `Đổi ${redeemPoints} điểm thành voucher giảm ${discount.toLocaleString()}đ. Còn lại: ${newPoints} điểm.`,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message ?? 'Lỗi server khi đổi điểm',
    }, { status: 500 });
  }
}
