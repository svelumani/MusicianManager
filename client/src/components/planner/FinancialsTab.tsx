import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TableHeader, TableRow, TableHead, TableBody, TableCell, Table } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DollarSign, FileText, Calendar, Users } from "lucide-react";
import { format } from "date-fns";

interface FinancialsTabProps {
  plannerId: number;
  plannerName: string;
  month: number;
  year: number;
}

const FinancialsTab = ({ plannerId, plannerName, month, year }: FinancialsTabProps) => {
  // Format month name
  const monthName = format(new Date(year, month - 1), "MMMM");

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Financial Summary - {monthName} {year}</span>
          <Button size="sm" variant="outline" className="gap-1">
            <FileText className="h-4 w-4" /> 
            <span>Export Report</span>
          </Button>
        </CardTitle>
        <CardDescription>
          Monthly financial overview and musician payment tracking
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Performances</CardDescription>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span>-- Performances</span>
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Musician Payments</CardDescription>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4 text-green-500" />
                <span>$--</span>
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Net Revenue</CardDescription>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <span>$--</span>
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Musician</TableHead>
              <TableHead>Performances</TableHead>
              <TableHead>Amount Due</TableHead>
              <TableHead>Payment Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={5} className="text-center py-10 text-gray-500">
                Financial reports will be implemented in Phase 3.
                <br />
                <span className="text-sm text-gray-400 mt-2 block">
                  Coming soon: Payment tracking, revenue reporting, and invoice generation
                </span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default FinancialsTab;