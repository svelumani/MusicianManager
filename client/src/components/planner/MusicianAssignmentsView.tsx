import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TableHeader, TableRow, TableHead, TableBody, TableCell, Table } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Calendar, 
  User, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Send,
  AlertCircle,
  Music
} from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import GenerateContractButton from "./GenerateContractButton";

interface MusicianAssignmentsViewProps {
  plannerId: number;
  plannerName: string;
  month: number;
  year: number;
}

// Status badge with color coding (can be extracted to a shared component)
const AttendanceBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "attended":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Attended</Badge>;
    case "absent":
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Absent</Badge>;
    case "confirmed":
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Confirmed</Badge>;
    default:
      return <Badge variant="outline">Pending</Badge>;
  }
};

const ContractStatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "sent":
      return <Badge className="bg-pink-100 text-pink-800 hover:bg-pink-200">Contract Sent</Badge>;
    case "signed":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Contract Signed</Badge>;
    case "rejected":
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Contract Rejected</Badge>;
    default:
      return <Badge variant="outline">No Contract</Badge>;
  }
};

const MusicianAssignmentsView = ({ plannerId, plannerName, month, year }: MusicianAssignmentsViewProps) => {
  // Format month name for display
  const monthName = format(new Date(year, month - 1), "MMMM");

  // Fetch musician assignments grouped by musician
  const { data: musicianAssignments, isLoading, error } = useQuery({
    queryKey: ['/api/planner-assignments/by-musician', plannerId],
    enabled: !!plannerId
  });

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <Skeleton className="h-8 w-60" />
            <Skeleton className="h-8 w-40" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-96" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-red-500">Error Loading Assignments</CardTitle>
          <CardDescription>
            There was a problem loading the musician assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8 text-red-500">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>Failed to load musician assignments. Please try again.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Musicians - {monthName} {year}</span>
          <Button size="sm" variant="outline" className="gap-1">
            <FileText className="h-4 w-4" /> 
            <span>View All Contracts</span>
          </Button>
        </CardTitle>
        <CardDescription>
          View and manage all musician assignments and contracts for {monthName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion 
          type="multiple" 
          className="w-full"
          defaultValue={musicianAssignments && Object.keys(musicianAssignments).length > 0 ? [Object.keys(musicianAssignments)[0]] : []}
        >
          {musicianAssignments && Object.entries(musicianAssignments)
            .filter(([id, data]) => id !== '999') // Filter out error entries
            .map(([musicianId, data]) => {
              // @ts-ignore
              const { musicianName, assignments, totalFee } = data;
              
              if (!assignments || assignments.length === 0) return null;

              return (
                <AccordionItem key={musicianId} value={musicianId} className="border rounded-lg mb-4 p-2">
                  <AccordionTrigger className="px-4 py-2 hover:bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-blue-500" />
                        <span className="font-semibold">{musicianName}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">{assignments.length} performances</span>
                        <span className="font-semibold">${totalFee?.toFixed(2) || '0.00'}</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 py-2">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Venue</TableHead>
                          <TableHead>Attendance</TableHead>
                          <TableHead>Contract</TableHead>
                          <TableHead>Fee</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assignments.map((assignment: any) => (
                          <TableRow key={assignment.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <span>{format(new Date(assignment.date), "MMM d, yyyy")}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Music className="h-4 w-4 text-gray-500" />
                                <span>{assignment.venueName || 'Not specified'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <AttendanceBadge status={assignment.attendance || 'pending'} />
                            </TableCell>
                            <TableCell>
                              <ContractStatusBadge status={assignment.contractStatus || 'pending'} />
                            </TableCell>
                            <TableCell>${assignment.fee?.toFixed(2) || '0.00'}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <GenerateContractButton 
                                  assignmentIds={[assignment.id]}
                                  disabled={assignment.contractStatus === 'sent' || assignment.contractStatus === 'signed'}
                                />
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  disabled={assignment.contractStatus !== 'sent'}
                                  title="Resend contract email"
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost"
                                  title="Mark as attended"
                                  disabled={assignment.attendance === 'attended'}
                                  className={assignment.attendance === 'attended' ? 'text-green-500' : ''}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost"
                                  title="Mark as absent"
                                  disabled={assignment.attendance === 'absent'}
                                  className={assignment.attendance === 'absent' ? 'text-red-500' : ''}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              );
            })}

          {(!musicianAssignments || Object.keys(musicianAssignments).filter(id => id !== '999').length === 0) && (
            <div className="text-center py-10 text-gray-500">
              No musicians assigned for {monthName} {year}
            </div>
          )}
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default MusicianAssignmentsView;