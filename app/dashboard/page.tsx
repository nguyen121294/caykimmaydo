import DashboardShell from '@/app/components/dashboard-shell';
import DashboardContent from './_components/dashboard-content';

export default function DashboardPage() {
  return (
    <DashboardShell>
      <DashboardContent />
    </DashboardShell>
  );
}
