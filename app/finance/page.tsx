import DashboardShell from '@/app/components/dashboard-shell';
import FinanceContent from './_components/finance_content';

export default function FinancePage() {
  return (
    <DashboardShell>
      <FinanceContent />
    </DashboardShell>
  );
}
