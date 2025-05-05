import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';
import GenerateContractButton from './GenerateContractButton';
import { CheckCircle, AlertCircle, Clock, Send, FileText } from 'lucide-react';

interface MusicianAssignmentsViewProps {
  plannerId: number;
  month: number;
  year: number;
}

const CONTRACT_STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-800',
  'contract generated': 'bg-teal-100 text-teal-800',
  sent: 'bg-blue-100 text-blue-800',
  signed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-amber-100 text-amber-800',
  'needs-revision': 'bg-purple-100 text-purple-800'
};

const CONTRACT_STATUS_ICONS = {
  pending: <Clock className="h-4 w-4 mr-1" />,
  'contract generated': <FileText className="h-4 w-4 mr-1" />,
  sent: <Send className="h-4 w-4 mr-1" />,
  signed: <CheckCircle className="h-4 w-4 mr-1" />,
  rejected: <AlertCircle className="h-4 w-4 mr-1" />,
  cancelled: <AlertCircle className="h-4 w-4 mr-1" />,
  'needs-revision': <AlertCircle className="h-4 w-4 mr-1" />
};

export default function MusicianAssignmentsView({ plannerId, month, year }: MusicianAssignmentsViewProps) {
  const { toast } = useToast();
  const [selectedAssignments, setSelectedAssignments] = useState<{[key: number]: number[]}>({}); // key: musicianId, value: array of assignmentIds
  const [expandedMusicians, setExpandedMusicians] = useState<string[]>([]);

  // Query to get assignments grouped by musician
  const {
    data: musicianAssignments,
    isLoading: isAssignmentsLoading,
    error: assignmentsError,
    refetch: refetchAssignments
  } = useQuery({
    // Use a consistent key format that matches what's used in GenerateContractButton
    queryKey: [`/api/planner-assignments/by-musician`],
    queryFn: async () => {
      try {
        return await apiRequest(`/api/planner-assignments/by-musician/${plannerId}`);
      } catch (error) {
        console.error('Error fetching musician assignments:', error);
        return {};
      }
    },
    enabled: !!plannerId && plannerId > 0,
  });

  // Create object of selected assignments for each musician
  useEffect(() => {
    const initialSelection: {[key: number]: number[]} = {};
    
    if (musicianAssignments && typeof musicianAssignments === 'object') {
      // For each musician, create an empty array to store selected assignment IDs
      Object.keys(musicianAssignments).forEach(musicianIdStr => {
        if (musicianIdStr === '_status' || musicianIdStr === '_message' || musicianIdStr === '_errorType') return;
        
        const musicianId = parseInt(musicianIdStr);
        if (!isNaN(musicianId)) {
          initialSelection[musicianId] = [];
        }
      });
    }
    
    setSelectedAssignments(initialSelection);
  }, [musicianAssignments]);

  // Handle checkbox change
  const handleAssignmentSelection = (musicianId: number, assignmentId: number, checked: boolean) => {
    setSelectedAssignments(prev => {
      const updatedAssignments = { ...prev };
      
      if (!updatedAssignments[musicianId]) {
        updatedAssignments[musicianId] = [];
      }
      
      if (checked) {
        // Add assignment ID if not already in the array
        if (!updatedAssignments[musicianId].includes(assignmentId)) {
          updatedAssignments[musicianId] = [...updatedAssignments[musicianId], assignmentId];
        }
      } else {
        // Remove assignment ID from the array
        updatedAssignments[musicianId] = updatedAssignments[musicianId].filter(id => id !== assignmentId);
      }
      
      return updatedAssignments;
    });
  };

  // Handle "Select All" for a musician
  const handleSelectAllForMusician = (musicianId: number, checked: boolean) => {
    if (!musicianAssignments || !musicianAssignments[musicianId]) return;
    
    setSelectedAssignments(prev => {
      const updatedAssignments = { ...prev };
      
      if (checked) {
        // Select all assignments for this musician that don't already have a contract
        updatedAssignments[musicianId] = musicianAssignments[musicianId].assignments
          .filter((assignment: any) => !assignment.contractId || assignment.contractStatus === 'pending')
          .map((assignment: any) => assignment.id);
      } else {
        // Deselect all assignments for this musician
        updatedAssignments[musicianId] = [];
      }
      
      return updatedAssignments;
    });
  };

  // Handle contract generation success
  const handleContractGenerated = (musicianId: number) => {
    // Clear selections for this musician
    setSelectedAssignments(prev => ({
      ...prev,
      [musicianId]: []
    }));
    
    // Refetch assignments to get updated contract statuses
    refetchAssignments();
    
    // Show a success toast
    toast({
      title: 'Contract Generated',
      description: 'The contract has been successfully generated.',
    });
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'EEE, MMM d');
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Get the status badge with appropriate color
  const getStatusBadge = (status: string) => {
    const colorClass = CONTRACT_STATUS_COLORS[status as keyof typeof CONTRACT_STATUS_COLORS] || 'bg-gray-100 text-gray-800';
    const icon = CONTRACT_STATUS_ICONS[status as keyof typeof CONTRACT_STATUS_ICONS] || <Clock className="h-4 w-4 mr-1" />;
    
    return (
      <Badge variant="outline" className={`${colorClass} flex items-center`}>
        {icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Check if all assignments for a musician are selected
  const areAllSelected = (musicianId: number) => {
    if (!musicianAssignments || !musicianAssignments[musicianId]) return false;
    
    const selectableAssignments = musicianAssignments[musicianId].assignments
      .filter((assignment: any) => !assignment.contractId || assignment.contractStatus === 'pending');
    
    return selectableAssignments.length > 0 && 
           selectedAssignments[musicianId]?.length === selectableAssignments.length;
  };

  // Loading state
  if (isAssignmentsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Error state
  if (assignmentsError) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardHeader>
          <CardTitle className="text-red-700">Error Loading Assignments</CardTitle>
          <CardDescription className="text-red-600">
            There was a problem loading musician assignments. Please try again later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => refetchAssignments()} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!musicianAssignments || Object.keys(musicianAssignments).length === 0 || 
      (musicianAssignments._status && musicianAssignments._status === 'empty')) {
    return (
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle>No Assignments Found</CardTitle>
          <CardDescription>
            There are no musicians assigned to any slots for this month yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">
            Go to the Calendar tab to assign musicians to performance slots first.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Filter out special keys from musicianAssignments
  const filteredMusicianIds = Object.keys(musicianAssignments).filter(
    key => !['_status', '_message', '_errorType', '_details', '_stack'].includes(key)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Musician Assignments</h2>
      </div>
      
      <p className="text-gray-500">
        Select assignments for each musician to generate contracts. You can generate one contract per musician
        containing multiple dates, or create individual contracts for specific dates.
      </p>
      
      <Accordion
        type="multiple"
        value={expandedMusicians}
        onValueChange={setExpandedMusicians}
        className="space-y-4"
      >
        {filteredMusicianIds.map(musicianIdStr => {
          const musicianId = parseInt(musicianIdStr);
          if (isNaN(musicianId)) return null;
          
          const musicianData = musicianAssignments[musicianId];
          if (!musicianData || !musicianData.assignments || musicianData.assignments.length === 0) return null;
          
          // Sort assignments by date
          const sortedAssignments = [...musicianData.assignments].sort((a: any, b: any) => {
            const dateA = new Date(a.date || a.slotDate);
            const dateB = new Date(b.date || b.slotDate);
            return dateA.getTime() - dateB.getTime();
          });
          
          // Group assignments by contract status
          const contractGroups: {[key: string]: any[]} = {
            pending: [],
            'contract generated': [],
            sent: [],
            signed: [],
            rejected: [],
            cancelled: [],
            'needs-revision': []
          };
          
          sortedAssignments.forEach((assignment: any) => {
            const status = assignment.contractStatus || 'pending';
            if (!contractGroups[status]) contractGroups[status] = [];
            contractGroups[status].push(assignment);
          });
          
          // Get count of assignments that don't have a contract yet
          const pendingAssignments = sortedAssignments.filter(
            (assignment: any) => !assignment.contractId || assignment.contractStatus === 'pending'
          );
          
          return (
            <AccordionItem 
              key={musicianId} 
              value={musicianId.toString()}
              className="border rounded-lg overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`select-all-${musicianId}`}
                      checked={areAllSelected(musicianId)}
                      disabled={pendingAssignments.length === 0}
                      onCheckedChange={(checked) => {
                        // Prevent accordion toggle when clicking checkbox
                        if (checked !== 'indeterminate') {
                          handleSelectAllForMusician(musicianId, checked);
                        }
                        // Stop propagation to prevent accordion toggle
                        event?.stopPropagation();
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="mr-2"
                    />
                    <span className="font-semibold">{musicianData.musicianName}</span>
                    <Badge variant="outline" className="ml-2">
                      {sortedAssignments.length} {sortedAssignments.length === 1 ? 'assignment' : 'assignments'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {Object.entries(contractGroups).map(([status, assignments]) => {
                      if (assignments.length === 0) return null;
                      return (
                        <Badge key={status} variant="outline" className={CONTRACT_STATUS_COLORS[status as keyof typeof CONTRACT_STATUS_COLORS]}>
                          {assignments.length} {status}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </AccordionTrigger>
              
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Select</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Venue</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Fee</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Contract</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedAssignments.map((assignment: any) => {
                        const isDisabled = assignment.contractId && assignment.contractStatus !== 'pending';
                        const slotDate = assignment.date || assignment.slotDate;
                        const venueName = assignment.venueName || 'Unknown Venue';
                        const startTime = assignment.startTime || '19:00';
                        const endTime = assignment.endTime || '22:00';
                        const fee = assignment.actualFee || 0;
                        const status = assignment.contractStatus || 'pending';
                        
                        return (
                          <TableRow key={assignment.id}>
                            <TableCell>
                              <Checkbox
                                id={`assignment-${assignment.id}`}
                                checked={selectedAssignments[musicianId]?.includes(assignment.id)}
                                disabled={isDisabled}
                                onCheckedChange={(checked) => {
                                  if (checked !== 'indeterminate') {
                                    handleAssignmentSelection(musicianId, assignment.id, checked);
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell>{formatDate(slotDate)}</TableCell>
                            <TableCell>{venueName}</TableCell>
                            <TableCell>{startTime} - {endTime}</TableCell>
                            <TableCell>${fee.toFixed(2)}</TableCell>
                            <TableCell>{getStatusBadge(status)}</TableCell>
                            <TableCell>
                              {assignment.contractId ? (
                                <span className="text-sm text-gray-500">#{assignment.contractId}</span>
                              ) : (
                                <span className="text-sm text-gray-500">Not contracted</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  
                  <div className="flex justify-end gap-2">
                    {selectedAssignments[musicianId]?.length > 0 && (
                      <GenerateContractButton
                        plannerId={plannerId}
                        month={month}
                        year={year}
                        musicianId={musicianId}
                        assignmentIds={selectedAssignments[musicianId]}
                        onContractGenerated={() => handleContractGenerated(musicianId)}
                      />
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}