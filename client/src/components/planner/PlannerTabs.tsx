import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PlannerGrid from './PlannerGrid';
import MusicianAssignmentsView from './MusicianAssignmentsView';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import { Calendar, Users, FileText, DollarSign } from 'lucide-react';

interface PlannerTabsProps {
  plannerId: number;
  month: number;
  year: number;
}

export default function PlannerTabs({ plannerId, month, year }: PlannerTabsProps) {
  const [activeTab, setActiveTab] = useState('calendar');

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Sync URL with tab state
  useEffect(() => {
    // If URL has a tab parameter, use it to set the active tab
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');

    if (tabParam && ['calendar', 'musicians', 'contracts', 'financials'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  // Update URL when tab changes
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', activeTab);
    window.history.replaceState({}, '', url.toString());
  }, [activeTab]);

  return (
    <Tabs 
      defaultValue={activeTab} 
      value={activeTab} 
      onValueChange={handleTabChange}
      className="w-full"
    >
      <TabsList className="grid grid-cols-4 mb-6">
        <TabsTrigger value="calendar" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline">Calendar</span>
        </TabsTrigger>
        <TabsTrigger value="musicians" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Musicians</span>
        </TabsTrigger>
        <TabsTrigger value="contracts" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Contracts</span>
        </TabsTrigger>
        <TabsTrigger value="financials" className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          <span className="hidden sm:inline">Financials</span>
        </TabsTrigger>
      </TabsList>

      {/* Calendar Tab */}
      <TabsContent value="calendar" className="w-full">
        <PlannerGrid 
          plannerId={plannerId} 
          month={month} 
          year={year} 
          onPrepareContracts={() => setActiveTab('musicians')}
        />
      </TabsContent>

      {/* Musicians Tab */}
      <TabsContent value="musicians" className="w-full">
        <MusicianAssignmentsView 
          plannerId={plannerId} 
          month={month} 
          year={year}
        />
      </TabsContent>

      {/* Contracts Tab */}
      <TabsContent value="contracts" className="w-full">
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold">Contract Management</h2>
          <p className="text-gray-500">
            This tab will display a comprehensive view of all contracts for the selected month.
            It will show contract status, payment status, and allow for contract generation and sending.
          </p>
          <div className="p-8 border rounded-lg flex flex-col items-center justify-center text-center">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Contract Management</h3>
            <p className="text-gray-500 mb-4">
              To manage contracts, please use the Musicians tab to select musicians and create contracts for them.
              Once contracts are created, you can view and manage them here.
            </p>
          </div>
        </div>
      </TabsContent>

      {/* Financials Tab */}
      <TabsContent value="financials" className="w-full">
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold">Financial Summary</h2>
          <p className="text-gray-500">
            This tab will provide financial reports and summaries for the selected month.
            It will include charts and breakdowns of costs, payments, and pending amounts.
          </p>
          <div className="p-8 border rounded-lg flex flex-col items-center justify-center text-center">
            <DollarSign className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Financial Overview</h3>
            <p className="text-gray-500 mb-4">
              Financial reporting is coming soon. This will include:
              <br />- Revenue and cost breakdowns
              <br />- Payment tracking
              <br />- Budget vs. actual analysis
            </p>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}