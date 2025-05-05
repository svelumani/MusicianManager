import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Users, FileText, DollarSign } from "lucide-react";
import PlannerGrid from "./PlannerGrid";
import MusicianAssignments from "./MusicianAssignments";
import ContractsTab from "./ContractsTab";
import FinancialsTab from "./FinancialsTab";
import { format } from "date-fns";

interface PlannerTabsProps {
  planner: any;
  venues: any[];
  categories: any[];
  selectedMonth: string;
  plannerId: number;
  plannerName: string;
  month: number;
  year: number;
}

const PlannerTabs = ({
  planner,
  venues,
  categories,
  selectedMonth,
  plannerId,
  plannerName,
  month,
  year,
}: PlannerTabsProps) => {
  const [activeTab, setActiveTab] = useState("calendar");

  // Format month name
  const monthName = format(new Date(year, month - 1), "MMMM");

  return (
    <Tabs
      defaultValue="calendar"
      className="w-full"
      value={activeTab}
      onValueChange={setActiveTab}
    >
      <TabsList className="grid grid-cols-4 mb-8">
        <TabsTrigger value="calendar" className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
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

      <TabsContent value="calendar" className="space-y-4">
        <PlannerGrid
          planner={planner}
          venues={venues}
          categories={categories}
          selectedMonth={selectedMonth}
        />
      </TabsContent>

      <TabsContent value="musicians" className="space-y-4">
        <MusicianAssignments
          plannerId={plannerId}
          plannerName={plannerName}
          month={month}
          year={year}
        />
      </TabsContent>

      <TabsContent value="contracts" className="space-y-4">
        <ContractsTab
          plannerId={plannerId}
          plannerName={plannerName}
          month={month}
          year={year}
        />
      </TabsContent>

      <TabsContent value="financials" className="space-y-4">
        <div className="text-center py-10 text-gray-500">
          Financial reports tab is coming soon.
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default PlannerTabs;