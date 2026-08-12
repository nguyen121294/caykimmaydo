import DashboardShell from '@/app/components/dashboard-shell';
import FinanceContent from './_components/finance_content';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { redirect } from 'next/navigation';

export default async function FinancePage() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'admin') redirect('/dashboard');
  return (
    <DashboardShell>
      <FinanceContent />
    </DashboardShell>
  );
}
