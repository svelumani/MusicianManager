import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TableHeader, TableRow, TableHead, TableBody, TableCell, Table } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { MoreHorizontal, FileText, Send, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ContractsTabProps {
  plannerId: number;
  plannerName: string;
  month: number;
  year: number;
}

// Status badge with color coding (can be extracted to a shared component)
const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "sent":
      return <Badge className="bg-pink-100 text-pink-800 hover:bg-pink-200">Contract Sent</Badge>;
    case "signed":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Contract Signed</Badge>;
    case "rejected":
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Contract Rejected</Badge>;
    default:
      return <Badge variant="outline">Pending</Badge>;
  }
};

const ContractsTab = ({ plannerId, plannerName, month, year }: ContractsTabProps) => {
  // For phase 1, this is just a placeholder
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Monthly Contracts</span>
          <Button size="sm" variant="outline" className="gap-1">
            <FileText className="h-4 w-4" /> 
            <span>Generate Contracts</span>
          </Button>
        </CardTitle>
        <CardDescription>
          Manage contracts for musicians assigned to this month's performances
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Musician</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Event Date</TableHead>
              <TableHead>Sent Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                Contract management will be implemented in Phase 2.
                <br />
                <span className="text-sm text-gray-400 mt-2 block">
                  Coming soon: Contract status tracking, response links and email integration
                </span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ContractsTab;