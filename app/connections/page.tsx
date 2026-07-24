import DashboardShell from '@/app/components/dashboard-shell';
import ConnectionsContent from './_components/connections_content';

export default function ConnectionsPage() {
  return (
    <DashboardShell>
      <ConnectionsContent />
    </DashboardShell>
  );
}
