import DashboardShell from '@/app/components/dashboard-shell';
import OrdersContent from './_components/orders-content';

export default function OrdersPage() {
  return (
    <DashboardShell>
      <OrdersContent />
    </DashboardShell>
  );
}
