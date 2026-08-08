import DashboardShell from '@/app/components/dashboard-shell';
import CampaignManager from './_components/campaign-manager';

export default function CampaignsPage() {
  return (
    <DashboardShell>
      <CampaignManager />
    </DashboardShell>
  );
}
