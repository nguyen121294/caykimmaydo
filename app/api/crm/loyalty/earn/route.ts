export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

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

    const { customerId, orderId, orderValue } = await req.json();

    if (!customerId || !orderValue) {
      return NextResponse.json({
        success: false,
        error: 'Thiếu customerId hoặc orderValue',
      }, { status: 400 });
    }

    const points = Math.floor(Number(orderValue) / 10000);
    if (points <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Giá trị đơn hàng không hợp lệ để tích điểm',
      }, { status: 400 });
    }

    // Kiểm tra khách hàng tồn tại
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return NextResponse.json({ success: false, error: 'Khách hàng không tồn tại' }, { status: 404 });
    }

    // Kiểm tra orderId đã cộng điểm chưa
    if (orderId) {
      const existingTx = await prisma.loyaltyTransaction.findFirst({
        where: { customerId, orderId, type: 'earn' },
      });
      if (existingTx) {
        return NextResponse.json({
          success: false,
          error: `Đơn hàng ${orderId} đã được cộng điểm trước đó`,
        }, { status: 400 });
      }
    }

    // Tạo transaction
    await prisma.loyaltyTransaction.create({
      data: {
        customerId,
        orderId: orderId || null,
        type: 'earn',
        points,
        amount: Number(orderValue),
        description: `Cộng ${points} điểm từ đơn ${Number(orderValue).toLocaleString()}đ`,
      },
    });

    // Update customer
    const newPoints = customer.loyaltyPoints + points;
    const newTotalSpent = customer.totalSpent + Number(orderValue);
    const newTotalOrders = customer.totalOrders + 1;

    await prisma.customer.update({
      where: { id: customerId },
      data: {
        loyaltyPoints: newPoints,
        loyaltyTier: calculateTier(newPoints),
        totalSpent: newTotalSpent,
        totalOrders: newTotalOrders,
        lastPurchaseDate: new Date().toISOString().slice(0, 10),
      },
    });

    return NextResponse.json({
      success: true,
      pointsEarned: points,
      totalPoints: newPoints,
      tier: calculateTier(newPoints),
      message: `Cộng ${points} điểm thành công. Tổng: ${newPoints} điểm (${calculateTier(newPoints)})`,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message ?? 'Lỗi server khi cộng điểm',
    }, { status: 500 });
  }
}
