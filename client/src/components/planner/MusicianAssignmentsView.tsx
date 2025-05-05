import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarIcon, UserCircle, Send, Eye, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface MusicianAssignmentsViewProps {
  plannerId: number;
  plannerName: string;
  month: number;
  year: number;
}

// Status badge with color coding
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

const MusicianAssignmentsView = ({ plannerId, plannerName, month, year }: MusicianAssignmentsViewProps) => {
  // State for open date sections
  const [openDates, setOpenDates] = useState<string[]>([]);
  // State for send contract dialog
  const [sendContractDialogOpen, setSendContractDialogOpen] = useState(false);
  const [selectedMusician, setSelectedMusician] = useState<any>(null);

  // Format month name
  const monthName = format(new Date(year, month - 1), "MMMM");

  // Query to get assignments grouped by musician and date
  const {
    data: musicianAssignments,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['/api/planner-assignments/by-musician', plannerId],
    queryFn: async () => {
      return await apiRequest(`/api/planner-assignments/by-musician?plannerId=${plannerId}`);
    },
    enabled: !!plannerId && plannerId > 0,
  });

  // Group assignments by date for each musician
  const groupedByDate = (assignments: any[] = []) => {
    const result: Record<string, any[]> = {};
    
    assignments.forEach(assignment => {
      const dateKey = format(new Date(assignment.date), "yyyy-MM-dd");
      if (!result[dateKey]) {
        result[dateKey] = [];
      }
      result[dateKey].push(assignment);
    });
    
    return result;
  };

  // Handle opening/closing date sections
  const toggleDateSection = (dateKey: string) => {
    setOpenDates(prev => 
      prev.includes(dateKey) 
        ? prev.filter(date => date !== dateKey)
        : [...prev, dateKey]
    );
  };

  // Open send contract dialog
  const handleSendContract = (musician: any) => {
    setSelectedMusician(musician);
    setSendContractDialogOpen(true);
  };

  // Handle view profile
  const handleViewProfile = (musicianId: number) => {
    // Will be implemented in a future iteration, just placeholder for now
    console.log("View profile for musician:", musicianId);
  };

  // Check if we have real data
  const hasRealData = musicianAssignments && 
                    Object.entries(musicianAssignments)
                      .filter(([key]) => !key.startsWith('_') && key !== '999')
                      .length > 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Assigned Musicians</span>
        </CardTitle>
        <CardDescription>
          The following musicians are assigned to this month
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : error ? (
          <div className="text-center py-4 text-red-500">
            Error loading musician assignments
          </div>
        ) : !hasRealData ? (
          <div className="text-center py-4 text-gray-500">
            No musician assignments for this month
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(musicianAssignments)
              .filter(([key]) => !key.startsWith('_') && key !== '999')
              .map(([musicianId, data]: [string, any]) => {
                const dateGroups = groupedByDate(data.assignments);
                
                return (
                  <Card key={musicianId} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <UserCircle className="h-5 w-5 text-blue-500" />
                          <CardTitle className="text-lg">{data.musicianName}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="rounded-full">
                            {data.assignments?.length || 0} dates
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleViewProfile(parseInt(musicianId))}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSendContract(data)}>
                                <Send className="h-4 w-4 mr-2" />
                                Accept & Send Contract
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <CardDescription>{data.musicianEmail || 'No email available'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(dateGroups).map(([dateKey, assignments]) => {
                          const isOpen = openDates.includes(dateKey);
                          const dateObj = new Date(dateKey);
                          const formattedDate = format(dateObj, "EEEE, MMMM d, yyyy");
                          // Mock status - in real implementation this would come from the contract status
                          const status = assignments[0]?.contractStatus || "pending";
                          
                          return (
                            <Collapsible 
                              key={dateKey}
                              open={isOpen}
                              onOpenChange={() => toggleDateSection(dateKey)}
                              className="border rounded-md"
                            >
                              <CollapsibleTrigger className="flex justify-between items-center w-full p-3 hover:bg-gray-50">
                                <div className="flex items-center">
                                  <CalendarIcon className="mr-2 h-4 w-4 text-blue-500" />
                                  <span className="font-medium">{formattedDate}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <StatusBadge status={status} />
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="border-t px-3 py-2">
                                <div className="space-y-2">
                                  {assignments.map((assignment: any) => (
                                    <div 
                                      key={assignment.id}
                                      className="flex justify-between items-center"
                                    >
                                      <div>
                                        <div className="text-sm">
                                          {assignment.venueName || 'Venue not specified'}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {assignment.time || "Time not specified"}
                                        </div>
                                      </div>
                                      <div className="font-medium text-primary">
                                        ${(assignment.actualFee || assignment.fee || 0).toLocaleString()}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}
      </CardContent>

      {/* Send Contract Dialog */}
      <Dialog open={sendContractDialogOpen} onOpenChange={setSendContractDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Contract to {selectedMusician?.musicianName}</DialogTitle>
            <DialogDescription>
              This will generate and send a contract to the musician for the selected dates in {monthName} {year}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2">
            <p><strong>Musician:</strong> {selectedMusician?.musicianName}</p>
            <p><strong>Email:</strong> {selectedMusician?.musicianEmail || 'No email available'}</p>
            <p><strong>Dates:</strong> {selectedMusician?.assignments?.length || 0} performance dates</p>
            <p><strong>Total Fee:</strong> ${(selectedMusician?.totalFee || 0).toLocaleString()}</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSendContractDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              // This will be implemented in a later phase
              console.log("Sending contract to:", selectedMusician?.musicianId);
              setSendContractDialogOpen(false);
            }}>
              Send Contract
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default MusicianAssignmentsView;