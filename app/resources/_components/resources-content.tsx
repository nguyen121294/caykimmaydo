'use client';
import { BookOpen, Download, FileText, PlayCircle, HelpCircle, Mail, ExternalLink } from 'lucide-react';
import PageHeader from '@/app/components/page-header';

const downloads = [
  { name: 'SOP & Analytics Guide (PDF)', desc: 'Hướng dẫn đầy đủ 53 trang về SOP và analytics', href: '/MayDo_Complete_SOP_Analytics_Guide.pdf', icon: FileText },
];

const tutorials = [
  { title: 'Cách đọc Dashboard KPI', desc: 'Hướng dẫn hiểu các chỉ số trên dashboard', duration: '5 phút' },
  { title: 'Chạy A/B Test hiệu quả', desc: 'Cách thiết lập và đánh giá A/B test trên Meta Ads', duration: '10 phút' },
  { title: 'Tạo content video theo script', desc: 'Quy trình sản xuất video từ script đến publish', duration: '15 phút' },
  { title: 'Sử dụng Inbox Scripts chốt đơn', desc: 'Cách sử dụng script theo từng loại khách', duration: '8 phút' },
  { title: 'Setup Meta Ads Retargeting', desc: 'Tạo audiences MOF & BOF từ TOF data', duration: '12 phút' },
  { title: 'Nhập liệu vào Excel template', desc: 'Hướng dẫn nhập data đúng theo role', duration: '7 phút' },
];

const faqs = [
  { q: 'Dữ liệu cập nhật bao lâu 1 lần?', a: 'Dashboard tự động refresh mỗi 5 phút. Automation sync chạy mỗi 6 giờ. Bạn cũng có thể bấm nút "Làm mới" trên mỗi trang.' },
  { q: 'Làm sao để kết nối Meta Ads?', a: 'Vào trang Cài Đặt > Kết Nối Nền Tảng > Meta Ads > Nhập Access Token và Ad Account ID. Xem hướng dẫn chi tiết trong phần "Hướng dẫn".' },
  { q: 'ROAS được tính như thế nào?', a: 'ROAS = Tổng Doanh Thu / Tổng Chi Phí Quảng Cáo. Ví dụ: ROAS 5x nghĩa là cứ chi 1đ quảng cáo thì thu về 5đ doanh thu.' },
  { q: 'Ai có quyền truy cập những trang nào?', a: 'Hiện tại tất cả người dùng đều có quyền xem toàn bộ dashboard. Trong tương lai sẽ phân quyền theo role.' },
  { q: 'Làm sao xuất báo cáo?', a: 'Hiện tại bạn có thể tải file SOP PDF từ trang Tài Nguyên. Tính năng xuất báo cáo tùy chỉnh sẽ được bổ sung.' },
];

export default function ResourcesContent() {
  return (
    <div className="space-y-6">
      <PageHeader title="Tài Nguyên" description="Tài liệu, hướng dẫn và hỗ trợ" icon={BookOpen} />

      {/* Downloads */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
          <Download size={16} className="text-indigo-500" />
          Tải Tài Liệu
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(downloads ?? [])?.map?.((d: any, i: number) => {
            const Icon = d?.icon ?? FileText;
            return (
              <a
                key={i}
                href={d?.href ?? '#'}
                download
                className="flex items-center gap-3 p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition group"
              >
                <Icon className="w-8 h-8 text-indigo-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-indigo-800">{d?.name ?? ''}</p>
                  <p className="text-xs text-indigo-600">{d?.desc ?? ''}</p>
                </div>
                <Download className="w-5 h-5 text-indigo-400 group-hover:text-indigo-600 transition" />
              </a>
            );
          })}
        </div>
      </div>

      {/* Video Tutorials */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
          <PlayCircle size={16} className="text-purple-500" />
          Video Hướng Dẫn
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(tutorials ?? [])?.map?.((t: any, i: number) => (
            <div key={i} className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition">
              <div className="flex items-center gap-2 mb-2">
                <PlayCircle className="w-5 h-5 text-purple-500" />
                <span className="text-xs text-purple-500 font-medium">{t?.duration ?? ''}</span>
              </div>
              <p className="text-sm font-medium text-purple-900">{t?.title ?? ''}</p>
              <p className="text-xs text-purple-600 mt-1">{t?.desc ?? ''}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
          <HelpCircle size={16} className="text-emerald-500" />
          Câu Hỏi Thường Gặp (FAQ)
        </h3>
        <div className="space-y-3">
          {(faqs ?? [])?.map?.((f: any, i: number) => (
            <details key={i} className="group">
              <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-800 hover:text-indigo-600 transition">
                <HelpCircle size={14} className="text-gray-400 group-open:text-indigo-500" />
                {f?.q ?? ''}
              </summary>
              <p className="ml-6 mt-2 text-sm text-gray-600">{f?.a ?? ''}</p>
            </details>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-sm p-6 text-white">
        <h3 className="font-display font-bold text-lg mb-2">Cần hỗ trợ?</h3>
        <p className="text-sm text-white/80 mb-4">Liên hệ đội ngũ kỹ thuật nếu bạn gặp vấn đề với hệ thống</p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Mail size={14} />
            <span className="text-sm">support@maydo.vn</span>
          </div>
        </div>
      </div>
    </div>
  );
}
