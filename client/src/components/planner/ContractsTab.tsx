import { useEffect } from "react";
import ContractsView from "./ContractsView";

interface ContractsTabProps {
  plannerId: number;
  plannerName: string;
  month: number;
  year: number;
}

const ContractsTab = ({ plannerId, plannerName, month, year }: ContractsTabProps) => {
  // Render the enhanced ContractsView component
  return (
    <div className="w-full">
      <ContractsView 
        plannerId={plannerId} 
        plannerName={plannerName} 
        month={month} 
        year={year} 
      />
    </div>
  );
};

export default ContractsTab;