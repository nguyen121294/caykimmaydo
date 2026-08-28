export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Predefined Golden Script Formula (6 Steps)
const GOLDEN_FORMULAS = [
  {
    stepNumber: 1,
    name: 'HOOK (Gây chú ý)',
    duration: '3-5 giây',
    importance: 'Bắt buộc - Quyết định 80% thành bại của Video',
    goal: 'Làm người dùng dừng lại scroll ngay từ giây đầu tiên',
    principles: [
      'Visual bắt mắt, chuyển động nhanh hoặc so sánh trực diện',
      'Đánh trúng nỗi sợ/băn khoăn về vóc dáng, cân nặng, sự kiện',
      'POV hoặc đặt câu hỏi kích thích tò mò',
    ],
    dos: [
      'Bắt đầu trực tiếp vào vấn đề của người xem',
      'Dùng hình ảnh tương phản mạnh (Before vs After)',
      'Nêu câu hỏi ngắn gọn, gợi cảm xúc',
    ],
    donts: [
      'Tránh mở đầu bằng: "Chào mọi người, mình là...',
      'Tránh show logo thương hiệu to đùng ở 3s đầu',
      'Tránh giới thiệu chung chung không có điểm nhấn',
    ],
    examples: [
      '✅ "Cùng 1 chiếc váy – sao body này mặc đẹp hơn thế?"',
      '✅ "Nếu bạn có vai rộng hoặc bắp tay to – đừng mua đồ sẵn!"',
      '✅ "Đi tiệc tuần này mà chưa biết mặc gì để không bị chìm?"',
    ],
  },
  {
    stepNumber: 2,
    name: 'PAIN POINT (Khai thác vấn đề & Nỗi đau)',
    duration: '5-10 giây',
    importance: 'Tạo sự đồng cảm sâu sắc',
    goal: 'Nêu bật cảm giác thất vọng khi mua đồ sẵn hoặc tự ti về số đo',
    principles: [
      'Mô tả đúng tình huống người xem từng gặp phải',
      'Đánh trúng cảm xúc (mua đồ sẵn mặc bị rộng eo, chật vai, lộ bụng)',
    ],
    dos: [
      'Dùng ngôn từ gần gũi, chân thực',
      'Chỉ ra lý do vì sao đồ đại trà không vừa người thật',
    ],
    donts: [
      'Không dùng giọng điệu phán xét cơ thể người xem',
      'Không nói quá đà gây tiêu cực',
    ],
    examples: [
      '✅ "Mua đồ sẵn size M thì vừa ngực nhưng eo lại rộng thùng thình, còn size S thì lại chật ních..."',
      '✅ "Ảnh mẫu mạng mặc sang chảnh, mua về mặc lên người thì lộ hết khuyết điểm bụng dưới..."',
    ],
  },
  {
    stepNumber: 3,
    name: 'EMPATHY & ROOT CAUSE (Đồng cảm & Nguyên nhân gốc)',
    duration: '5-8 giây',
    importance: 'Xóa bỏ mặc cảm & tạo thiện cảm',
    goal: 'Khẳng định: Không phải dáng bạn xấu – mà là do quần áo may sẵn thiết kế cho size ảo',
    principles: [
      'Cơ thể mỗi người là duy nhất, không ai giống ai',
      'May đo sinh ra chính là để tôn vinh nét đẹp riêng của từng người',
    ],
    dos: [
      'Nhắc nhở khách: Đồ đẹp là đồ vừa với mình',
      'Định vị giá trị may đo cá nhân hóa',
    ],
    donts: ['Không nói lý thuyết suông'],
    examples: [
      '✅ "Thật ra dáng bạn không hề xấu, chỉ là đồ may sẵn được sản xuất theo số đo trung bình chung..."',
    ],
  },
  {
    stepNumber: 4,
    name: 'SOLUTION (Giải pháp từ Cây Kim May Đo)',
    duration: '10-15 giây',
    importance: 'Trưng bày năng lực may đo & chất lượng vải',
    goal: 'Cho thấy Cây Kim May Đo giải quyết vấn đề đó chính xác như thế nào',
    principles: [
      'Lấy số đo cá nhân, căn chỉnh đường cắt theo vóc dáng',
      'Lựa chọn chất vải có độ rủ, che khuyết điểm và tôn vòng eo',
      'Hỗ trợ chỉnh sửa miễn phí cho đến khi vừa ý nhất',
    ],
    dos: [
      'Quay cận cảnh đường may, thớ vải và quy trình tỉ mỉ',
      'Show chi tiết kỹ thuật: Hạ eo, chiết ly, độ xòe tà',
    ],
    donts: ['Không hứa hẹn những điều xưởng không làm được'],
    examples: [
      '✅ "Tụi mình may theo đúng 5 số đo của bạn, hạ eo chuẩn tỉ lệ và chọn vải lụa tơ rủ nhẹ giúp che trọn vòng 2..."',
    ],
  },
  {
    stepNumber: 5,
    name: 'PROOF (Bằng chứng thực tế & Feedback)',
    duration: '5-10 giây',
    importance: 'Xây dựng niềm tin vững chắc',
    goal: 'Chứng minh người thật việc thật mặc lên đẹp và tự tin',
    principles: [
      'Video/ảnh feedback thật của khách hàng sau khi nhận đồ',
      'Cảm xúc vui mừng, tự tin khi diện đồ đi sự kiện/tiệc cưới',
    ],
    dos: [
      'Dùng hình ảnh khách thật với đa dạng vóc dáng',
      'Trích dẫn câu khen chân thật của khách',
    ],
    donts: ['Tránh dùng hình mẫu Tây quá xa rời thực tế khách hàng'],
    examples: [
      '✅ "Chị khách bảo: Chưa bao giờ mặc chiếc váy nào mà cảm giác tự tin như thế khi đi đám cưới bạn thân!"',
    ],
  },
  {
    stepNumber: 6,
    name: 'CTA & OFFER (Kêu gọi hành động & Ưu đãi)',
    duration: '3-5 giây',
    importance: 'Chuyển đổi người xem thành tin nhắn tư vấn',
    goal: 'Hướng dẫn khách inbox hoặc lưu video để nhận quà/tư vấn miễn phí',
    principles: [
      'Lời kêu gọi đơn giản, rõ ràng, giảm áp lực mua hàng',
      'Kèm ưu đãi có giới hạn hoặc tư vấn số đo 1-1 miễn phí',
    ],
    dos: [
      'Chỉ rõ hành động: "Nhắn tin cho shop...", "Lưu lại video..."',
      'Tạo lý do nhắn ngay: Suất may giới hạn trong tuần',
    ],
    donts: ['Tránh đặt CTA quá phức tạp hoặc ép mua thô bạo'],
    examples: [
      '✅ "Nhắn tin cho Cây Kim May Đo kèm chiều cao & cân nặng để tụi mình tư vấn mẫu đầm chuẩn dáng cho bạn nha 💖"',
      '✅ "Save video để được giảm ngay 100k cho lần đầu may đo nhé!"',
    ],
  },
];

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req?.url ?? 'http://localhost');
    const stage = url?.searchParams?.get?.('stage') ?? '';
    const pillar = url?.searchParams?.get?.('pillar') ?? '';
    const status = url?.searchParams?.get?.('status') ?? '';
    const search = (url?.searchParams?.get?.('search') ?? '').trim().toLowerCase();

    // 1. Fetch Video Scripts
    const allScripts = await prisma.videoScript.findMany({
      orderBy: [{ funnelStage: 'asc' }, { scriptId: 'asc' }],
    });

    // 2. Fetch Calendar
    const allCalendar = await prisma.contentCalendar.findMany({
      orderBy: { createdAt: 'asc' },
    });

    // Filter Video Scripts
    let filteredScripts = allScripts;
    if (stage) {
      filteredScripts = filteredScripts.filter(s => s.funnelStage === stage);
    }
    if (pillar) {
      filteredScripts = filteredScripts.filter(s =>
        s.contentType.toLowerCase().includes(pillar.toLowerCase())
      );
    }
    if (status) {
      filteredScripts = filteredScripts.filter(s => s.status === status);
    }
    if (search) {
      filteredScripts = filteredScripts.filter(
        s =>
          s.scriptId.toLowerCase().includes(search) ||
          (s.contentType && s.contentType.toLowerCase().includes(search)) ||
          (s.hook && s.hook.toLowerCase().includes(search)) ||
          (s.painPoint && s.painPoint.toLowerCase().includes(search)) ||
          (s.solution && s.solution.toLowerCase().includes(search)) ||
          (s.cta && s.cta.toLowerCase().includes(search)) ||
          (s.caption && s.caption.toLowerCase().includes(search)) ||
          (s.targetAudience && s.targetAudience.toLowerCase().includes(search))
      );
    }

    // Filter Calendar
    let filteredCalendar = allCalendar;
    if (search) {
      filteredCalendar = filteredCalendar.filter(
        c =>
          (c.topic && c.topic.toLowerCase().includes(search)) ||
          (c.contentType && c.contentType.toLowerCase().includes(search)) ||
          (c.channel && c.channel.toLowerCase().includes(search)) ||
          (c.notes && c.notes.toLowerCase().includes(search))
      );
    }

    // Calculate Summary Stats
    const totalScripts = allScripts.length;
    const tofCount = allScripts.filter(s => s.funnelStage === 'TOF').length;
    const mofCount = allScripts.filter(s => s.funnelStage === 'MOF').length;
    const bofCount = allScripts.filter(s => s.funnelStage === 'BOF').length;
    const calendarCount = allCalendar.length;

    return NextResponse.json({
      scripts: filteredScripts,
      calendar: filteredCalendar,
      formulas: GOLDEN_FORMULAS,
      stats: {
        totalScripts,
        tofCount,
        mofCount,
        bofCount,
        calendarCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi khi truy vấn nội dung' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { itemType } = body;

    if (itemType === 'calendar') {
      const { date, week, contentType, topic, channel, postTime, status, notes } = body;
      if (!date || !topic) {
        return NextResponse.json({ error: 'Vui lòng nhập Ngày và Chủ đề nội dung' }, { status: 400 });
      }

      const id = `cal-${date}-${Date.now()}`.replace(/\s+/g, '-').toLowerCase();
      const newCal = await prisma.contentCalendar.create({
        data: {
          id,
          date: date.trim(),
          week: (week || 'Tuần 1').trim(),
          contentType: (contentType || 'Video Reels').trim(),
          topic: topic.trim(),
          channel: (channel || 'Instagram').trim(),
          postTime: (postTime || '20:00').trim(),
          status: (status || '📝 Chưa Làm').trim(),
          notes: (notes || '').trim(),
        },
      });
      return NextResponse.json({ success: true, item: newCal });
    } else {
      // Default: Video Script
      const {
        scriptId,
        funnelStage,
        contentType,
        hook,
        painPoint,
        solution,
        cta,
        caption,
        duration,
        targetAudience,
        expectedKpi,
        status,
      } = body;

      if (!scriptId || !funnelStage || !hook) {
        return NextResponse.json(
          { error: 'Vui lòng nhập đầy đủ: Mã kịch bản, Tầng phễu (TOF/MOF/BOF) và Hook' },
          { status: 400 }
        );
      }

      const newScript = await prisma.videoScript.create({
        data: {
          scriptId: scriptId.trim().toUpperCase(),
          funnelStage: funnelStage.trim().toUpperCase(),
          contentType: (contentType || 'BEFORE-AFTER').trim(),
          hook: hook.trim(),
          painPoint: (painPoint || '').trim(),
          solution: (solution || '').trim(),
          cta: (cta || '').trim(),
          caption: (caption || '').trim(),
          duration: (duration || '15-30s').trim(),
          targetAudience: (targetAudience || '').trim(),
          expectedKpi: (expectedKpi || '').trim(),
          status: (status || 'Chưa Dùng').trim(),
        },
      });
      return NextResponse.json({ success: true, item: newScript });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi khi tạo mục mới' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { itemType, id, scriptId } = body;

    if (itemType === 'calendar') {
      if (!id) return NextResponse.json({ error: 'Thiếu ID lịch đăng cần cập nhật' }, { status: 400 });
      const { date, week, contentType, topic, channel, postTime, status, notes } = body;

      const updatedCal = await prisma.contentCalendar.update({
        where: { id },
        data: {
          date: date?.trim(),
          week: week?.trim(),
          contentType: contentType?.trim(),
          topic: topic?.trim(),
          channel: channel?.trim(),
          postTime: postTime?.trim(),
          status: status?.trim(),
          notes: notes?.trim(),
        },
      });
      return NextResponse.json({ success: true, item: updatedCal });
    } else {
      // Video Script
      const targetScriptId = scriptId || id;
      if (!targetScriptId) {
        return NextResponse.json({ error: 'Thiếu Mã kịch bản cần cập nhật' }, { status: 400 });
      }

      const {
        funnelStage,
        contentType,
        hook,
        painPoint,
        solution,
        cta,
        caption,
        duration,
        targetAudience,
        expectedKpi,
        status,
      } = body;

      const updatedScript = await prisma.videoScript.update({
        where: { scriptId: targetScriptId },
        data: {
          funnelStage: funnelStage?.trim()?.toUpperCase(),
          contentType: contentType?.trim(),
          hook: hook?.trim(),
          painPoint: painPoint?.trim(),
          solution: solution?.trim(),
          cta: cta?.trim(),
          caption: caption?.trim(),
          duration: duration?.trim(),
          targetAudience: targetAudience?.trim(),
          expectedKpi: expectedKpi?.trim(),
          status: status?.trim(),
        },
      });
      return NextResponse.json({ success: true, item: updatedScript });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi khi cập nhật' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { scriptId, calendarId, status } = body ?? {};

    if (scriptId) {
      const updated = await prisma.videoScript.update({
        where: { scriptId },
        data: { status: status ?? 'Chưa Dùng' },
      });
      return NextResponse.json({ success: true, item: updated });
    }

    if (calendarId) {
      const updated = await prisma.contentCalendar.update({
        where: { id: calendarId },
        data: { status: status ?? '📝 Chưa Làm' },
      });
      return NextResponse.json({ success: true, item: updated });
    }

    return NextResponse.json({ error: 'Missing scriptId or calendarId' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi cập nhật trạng thái' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req?.url ?? 'http://localhost');
    const type = url?.searchParams?.get?.('type') ?? 'script';
    const id = url?.searchParams?.get?.('id');

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID mục cần xóa' }, { status: 400 });
    }

    if (type === 'calendar') {
      await prisma.contentCalendar.delete({ where: { id } });
    } else {
      await prisma.videoScript.delete({ where: { scriptId: id } });
    }

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi khi xóa' }, { status: 500 });
  }
}
