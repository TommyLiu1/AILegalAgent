import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { CaseDistribution } from '@/components/dashboard/CaseDistribution';
import { CaseTimeline } from '@/components/dashboard/CaseTimeline';
import { ComplianceScore } from '@/components/dashboard/ComplianceScore';
import { LawyerWorkload } from '@/components/dashboard/LawyerWorkload';
import { RealtimeAlerts } from '@/components/dashboard/RealtimeAlerts';
import { TokenUsage } from '@/components/dashboard/TokenUsage';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function Dashboard() {
  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        <DashboardHeader />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧 */}
          <div className="lg:col-span-2 space-y-6">
            <CaseDistribution />
            <CaseTimeline />
          </div>
          
          {/* 右侧 */}
          <div className="space-y-6">
            <ComplianceScore />
            <TokenUsage />
            <RealtimeAlerts />
          </div>
        </div>
        
        <LawyerWorkload />
      </div>
    </ScrollArea>
  );
}
