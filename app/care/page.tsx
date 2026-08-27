import DashboardShell from '@/app/components/dashboard-shell';
import CareContent from './_components/care_content';

export const metadata = {
  title: 'Lịch Hẹn & Chăm Sóc Khách Hàng | MayDo Dashboard',
  description: 'Trung tâm quản lý lịch hẹn tư vấn Sales Pipeline và chăm sóc khách hàng CRM MayDo',
};

export default function CarePage() {
  return (
    <DashboardShell>
      <CareContent />
    </DashboardShell>
  );
}
