export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req?.url ?? 'http://localhost');
    const category = url?.searchParams?.get?.('category') ?? url?.searchParams?.get?.('type') ?? '';
    const search = (url?.searchParams?.get?.('search') ?? '').trim();

    // Fetch all scripts for stats calculation
    const allScripts = await prisma.inboxScript.findMany({
      orderBy: { createdAt: 'asc' },
    });

    // Calculate stats
    const totalCount = allScripts.length;
    const flowCount = allScripts.filter(s => s.customerType === 'Quy trình chốt đơn').length;
    const objectionCount = allScripts.filter(s => s.customerType === 'Xử lý từ chối').length;
    const retentionCount = allScripts.filter(
      s => s.customerType === 'CSKH & Retention' || s.customerType === 'Khách hàng thân thiết'
    ).length;

    // Distinct categories with count
    const categoryMap = new Map<string, number>();
    for (const s of allScripts) {
      const cat = s.customerType || 'Khác';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    }
    const categories = Array.from(categoryMap.entries()).map(([name, count]) => ({ name, count }));

    // Filter scripts
    let filteredScripts = allScripts;

    if (category) {
      filteredScripts = filteredScripts.filter(s => s.customerType === category);
    }

    if (search) {
      const lower = search.toLowerCase();
      filteredScripts = filteredScripts.filter(
        s =>
          (s.label && s.label.toLowerCase().includes(lower)) ||
          (s.content && s.content.toLowerCase().includes(lower)) ||
          (s.customerType && s.customerType.toLowerCase().includes(lower)) ||
          (s.identifiers && s.identifiers.toLowerCase().includes(lower)) ||
          (s.messageNumber && s.messageNumber.toLowerCase().includes(lower))
      );
    }

    // Sort order: prioritize 'Quy trình chốt đơn', 'Xử lý từ chối', 'CSKH & Retention', 'Khách hàng thân thiết'
    const categoryPriority: Record<string, number> = {
      'Quy trình chốt đơn': 1,
      'Xử lý từ chối': 2,
      'CSKH & Retention': 3,
      'Khách hàng thân thiết': 4,
    };

    filteredScripts.sort((a, b) => {
      const pA = categoryPriority[a.customerType] ?? 99;
      const pB = categoryPriority[b.customerType] ?? 99;
      if (pA !== pB) return pA - pB;
      return 0; // keep createdAt order within category
    });

    return NextResponse.json({
      scripts: filteredScripts,
      categories,
      stats: {
        total: totalCount,
        flowCount,
        objectionCount,
        retentionCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi truy vấn dữ liệu' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerType, label, content, sender, messageNumber, identifiers, colorTag } = body;

    if (!customerType || !label || !content) {
      return NextResponse.json(
        { error: 'Vui lòng điền đầy đủ: Phân loại, Tiêu đề và Nội dung kịch bản' },
        { status: 400 }
      );
    }

    const newScript = await prisma.inboxScript.create({
      data: {
        customerType: customerType.trim(),
        label: label.trim(),
        content: content.trim(),
        sender: (sender || 'SHOP').trim(),
        messageNumber: (messageNumber || '').trim(),
        identifiers: (identifiers || '').trim(),
        colorTag: colorTag || 'blue',
        sheetName: 'Thủ công',
      },
    });

    return NextResponse.json({ success: true, script: newScript });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi khi tạo kịch bản' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, customerType, label, content, sender, messageNumber, identifiers, colorTag } = body;

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID kịch bản cần cập nhật' }, { status: 400 });
    }

    if (!customerType || !label || !content) {
      return NextResponse.json(
        { error: 'Vui lòng điền đầy đủ: Phân loại, Tiêu đề và Nội dung kịch bản' },
        { status: 400 }
      );
    }

    const updatedScript = await prisma.inboxScript.update({
      where: { id },
      data: {
        customerType: customerType.trim(),
        label: label.trim(),
        content: content.trim(),
        sender: (sender || 'SHOP').trim(),
        messageNumber: (messageNumber || '').trim(),
        identifiers: (identifiers || '').trim(),
        colorTag: colorTag || 'blue',
      },
    });

    return NextResponse.json({ success: true, script: updatedScript });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi khi cập nhật kịch bản' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req?.url ?? 'http://localhost');
    let id = url?.searchParams?.get?.('id');

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID kịch bản cần xóa' }, { status: 400 });
    }

    await prisma.inboxScript.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi khi xóa kịch bản' }, { status: 500 });
  }
}
