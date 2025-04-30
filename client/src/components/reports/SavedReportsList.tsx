import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Edit, Trash2, FileBarChart } from "lucide-react";

export default function SavedReportsList() {
  // Sample data for saved reports
  const savedReports = [
    { 
      id: 1, 
      name: "Q1 Financial Summary", 
      type: "Financial", 
      dateRange: "Jan 1, 2024 - Mar 31, 2024",
      createdBy: "Admin",
      createdAt: "Apr 5, 2024"
    },
    { 
      id: 2, 
      name: "Top Performing Venues", 
      type: "Venue Performance", 
      dateRange: "Last 90 Days",
      createdBy: "Admin",
      createdAt: "May 1, 2024"
    },
    { 
      id: 3, 
      name: "Musician Attendance", 
      type: "Musician Earnings", 
      dateRange: "Last Year",
      createdBy: "Admin",
      createdAt: "May 10, 2024"
    },
    { 
      id: 4, 
      name: "Summer Booking Forecast", 
      type: "Booking Trends", 
      dateRange: "Jun 1, 2024 - Aug 31, 2024",
      createdBy: "Admin",
      createdAt: "May 15, 2024"
    }
  ];

  // Mock functions for report actions
  const handleEdit = (id: number) => {
    alert(`Edit report ${id}`);
  };

  const handleDuplicate = (id: number) => {
    alert(`Duplicate report ${id}`);
  };

  const handleDelete = (id: number) => {
    alert(`Delete report ${id}`);
  };

  const handleLoad = (id: number) => {
    alert(`Load report ${id}`);
  };

  return (
    <div className="space-y-4">
      {savedReports.length === 0 ? (
        <div className="text-center py-8">
          <FileBarChart className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No saved reports</h3>
          <p className="text-muted-foreground">Save a report configuration to see it here</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date Range</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Created On</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {savedReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">
                    <Button variant="link" className="p-0 h-auto font-medium" onClick={() => handleLoad(report.id)}>
                      {report.name}
                    </Button>
                  </TableCell>
                  <TableCell>{report.type}</TableCell>
                  <TableCell>{report.dateRange}</TableCell>
                  <TableCell>{report.createdBy}</TableCell>
                  <TableCell>{report.createdAt}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(report.id)}
                        title="Edit report"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDuplicate(report.id)}
                        title="Duplicate report"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(report.id)}
                        title="Delete report"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}