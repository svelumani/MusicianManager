import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';
import { format } from 'date-fns';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Check,
  Calendar,
  Mail,
  FileText,
  Clock,
  MapPin,
  DollarSign,
  User,
  XCircle,
  CircleCheck,
  Clock3
} from 'lucide-react';

// Status badge helper
function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return <Badge variant="outline">Pending</Badge>;
    case 'sent':
      return <Badge variant="secondary" className="bg-pink-100 text-pink-800 hover:bg-pink-100">Contract Sent</Badge>;
    case 'signed':
      return <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-100">Contract Signed</Badge>;
    case 'rejected':
      return <Badge variant="destructive">Rejected</Badge>;
    case 'canceled':
      return <Badge variant="outline" className="bg-gray-100">Canceled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// Status color helper
function getStatusColor(status: string) {
  switch (status) {
    case 'pending':
      return 'bg-gray-50';
    case 'sent':
      return 'bg-pink-50';
    case 'signed':
      return 'bg-green-50';
    case 'rejected':
      return 'bg-red-50';
    case 'canceled':
      return 'bg-gray-100';
    default:
      return '';
  }
}

interface MusicianAssignment {
  id: number;
  date: string;
  venueName: string;
  fee: number;
  startTime: string;
  endTime: string;
  status: string;
  contractStatus?: string;
  contractId?: number;
}

interface MusicianGroup {
  musicianId: number;
  musicianName: string;
  assignments: MusicianAssignment[];
  totalFee: number;
}

interface MusicianAssignmentsViewProps {
  plannerId: number;
  month: number;
  year: number;
}

export default function MusicianAssignmentsView({ plannerId, month, year }: MusicianAssignmentsViewProps) {
  const { toast } = useToast();
  const [selectedAssignments, setSelectedAssignments] = useState<Record<number, boolean>>({});
  const [selectedMusician, setSelectedMusician] = useState<number | null>(null);
  const [contractNotes, setContractNotes] = useState('');
  
  // Fetch assignments grouped by musician
  const { data: musicianGroups, isLoading, error, refetch } = useQuery({
    queryKey: [`/api/planner-assignments/by-musician/${plannerId}`],
    queryFn: () => apiRequest(`/api/planner-assignments/by-musician/${plannerId}`),
    staleTime: 60000, // 1 minute
  });

  // Create contract mutation
  const createContractMutation = useMutation({
    mutationFn: (data: {
      plannerId: number;
      musicianId: number;
      assignmentIds: number[];
      notes: string;
    }) => apiRequest('/api/monthly-contracts', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
    }),
    onSuccess: () => {
      toast({
        title: 'Contract created',
        description: 'The contract has been created successfully.',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/planner-assignments/by-musician/${plannerId}`] });
      
      // Reset selection
      setSelectedAssignments({});
      setContractNotes('');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create contract: ' + (error as Error).message,
        variant: 'destructive',
      });
    },
  });

  // Send contract mutation
  const sendContractMutation = useMutation({
    mutationFn: (data: { contractId: number }) => apiRequest(`/api/monthly-contracts/${data.contractId}/send`, {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json',
      },
    }),
    onSuccess: () => {
      toast({
        title: 'Contract sent',
        description: 'The contract has been sent to the musician.',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/planner-assignments/by-musician/${plannerId}`] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to send contract: ' + (error as Error).message,
        variant: 'destructive',
      });
    },
  });

  // Update contract status mutation
  const updateContractStatusMutation = useMutation({
    mutationFn: (data: { contractId: number; status: string; notes?: string }) => 
      apiRequest(`/api/monthly-contracts/${data.contractId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: data.status, notes: data.notes }),
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    onSuccess: () => {
      toast({
        title: 'Contract updated',
        description: 'The contract status has been updated.',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/planner-assignments/by-musician/${plannerId}`] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update contract: ' + (error as Error).message,
        variant: 'destructive',
      });
    },
  });

  // Format date helper
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, 'EEE, MMM d, yyyy');
  };

  // Handle checkbox change
  const handleCheckboxChange = (assignmentId: number, isChecked: boolean) => {
    setSelectedAssignments(prev => ({
      ...prev,
      [assignmentId]: isChecked
    }));
  };

  // Handle select all for a musician
  const handleSelectAllForMusician = (musicianId: number, assignments: MusicianAssignment[], isChecked: boolean) => {
    const newSelections = { ...selectedAssignments };
    
    assignments.forEach(assignment => {
      // Only select assignments that don't already have a contract
      if (!assignment.contractId) {
        newSelections[assignment.id] = isChecked;
      }
    });
    
    setSelectedAssignments(newSelections);
    
    if (isChecked) {
      setSelectedMusician(musicianId);
    } else if (selectedMusician === musicianId) {
      setSelectedMusician(null);
    }
  };

  // Create contract handler
  const handleCreateContract = () => {
    if (!selectedMusician) {
      toast({
        title: 'Error',
        description: 'Please select a musician first.',
        variant: 'destructive',
      });
      return;
    }
    
    const selectedAssignmentIds = Object.entries(selectedAssignments)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => parseInt(id));
    
    if (selectedAssignmentIds.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one assignment.',
        variant: 'destructive',
      });
      return;
    }
    
    createContractMutation.mutate({
      plannerId,
      musicianId: selectedMusician,
      assignmentIds: selectedAssignmentIds,
      notes: contractNotes
    });
  };

  // Send contract handler
  const handleSendContract = (contractId: number) => {
    sendContractMutation.mutate({ contractId });
  };

  // Cancel contract handler
  const handleCancelContract = (contractId: number) => {
    updateContractStatusMutation.mutate({ 
      contractId, 
      status: 'canceled',
      notes: 'Contract canceled by admin'
    });
  };

  // Check if any musicians have active contracts
  const hasAnyContracts = () => {
    if (!musicianGroups) return false;
    
    return Object.values(musicianGroups).some(group => 
      group.assignments.some(a => a.contractId)
    );
  };

  // Group assignments by contract
  const getAssignmentsByContract = (assignments: MusicianAssignment[]) => {
    const contractGroups: Record<string, MusicianAssignment[]> = {};
    
    // First group assignments by contractId (or 'unassigned' if no contractId)
    assignments.forEach(assignment => {
      const key = assignment.contractId ? `contract-${assignment.contractId}` : 'unassigned';
      if (!contractGroups[key]) {
        contractGroups[key] = [];
      }
      contractGroups[key].push(assignment);
    });
    
    return contractGroups;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center my-8">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="my-4">
        <CardHeader>
          <CardTitle className="text-red-600">Error Loading Musician Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Failed to load musician assignments. Please try again later.</p>
          <Button onClick={() => refetch()} className="mt-4">Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  // Check if data is empty or has _status field indicating error/empty state
  if (!musicianGroups || Object.keys(musicianGroups).length === 0 || musicianGroups._status) {
    return (
      <Card className="my-4">
        <CardHeader>
          <CardTitle>No Musician Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <p>There are no musicians assigned to this month's performances yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="musicians">
        <TabsList className="mb-4">
          <TabsTrigger value="musicians">Musicians</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
        </TabsList>
        
        <TabsContent value="musicians">
          <div className="mb-4">
            <h2 className="text-xl font-bold mb-2">Musician Assignments</h2>
            <p className="text-muted-foreground mb-4">
              View and manage assignments by musician. Create contracts for multiple dates.
            </p>
          </div>
          
          <div className="space-y-6">
            {Object.values(musicianGroups).map((group: MusicianGroup) => (
              <Card key={group.musicianId} className="overflow-hidden">
                <CardHeader className="bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center">
                        <User className="mr-2 h-5 w-5" />
                        {group.musicianName}
                      </CardTitle>
                      <CardDescription>
                        {group.assignments.length} {group.assignments.length === 1 ? 'assignment' : 'assignments'} |
                        Total: ${group.totalFee}
                      </CardDescription>
                    </div>
                    <div className="flex items-center">
                      <Checkbox 
                        id={`select-all-${group.musicianId}`}
                        checked={group.assignments.every(a => selectedAssignments[a.id] || !!a.contractId)}
                        onCheckedChange={(checked) => {
                          // Only pass true/false, not indeterminate
                          handleSelectAllForMusician(group.musicianId, group.assignments, !!checked);
                        }}
                      />
                      <Label htmlFor={`select-all-${group.musicianId}`} className="ml-2">
                        Select All
                      </Label>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr className="border-b">
                        <th className="px-4 py-2 text-left">Select</th>
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-left">Time</th>
                        <th className="px-4 py-2 text-left">Venue</th>
                        <th className="px-4 py-2 text-left">Fee</th>
                        <th className="px-4 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.assignments.map((assignment) => {
                        const isContracted = !!assignment.contractId;
                        const rowClass = isContracted ? getStatusColor(assignment.contractStatus || 'pending') : '';
                        
                        return (
                          <tr key={assignment.id} className={`border-b ${rowClass}`}>
                            <td className="px-4 py-2">
                              <Checkbox
                                checked={!!selectedAssignments[assignment.id]}
                                onCheckedChange={(checked) => handleCheckboxChange(assignment.id, !!checked)}
                                disabled={isContracted}
                              />
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex items-center">
                                <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                                {formatDate(assignment.date)}
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex items-center">
                                <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                                {assignment.startTime} - {assignment.endTime}
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex items-center">
                                <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                                {assignment.venueName}
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex items-center">
                                <DollarSign className="mr-1 h-4 w-4 text-muted-foreground" />
                                ${assignment.fee}
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              {isContracted ? (
                                <>
                                  {getStatusBadge(assignment.contractStatus || 'pending')}
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Contract #{assignment.contractId}
                                  </div>
                                </>
                              ) : (
                                <Badge variant="outline">No Contract</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {Object.keys(selectedAssignments).some(id => selectedAssignments[id]) && (
            <Card className="mt-6 border-dashed">
              <CardHeader>
                <CardTitle>Create Contract</CardTitle>
                <CardDescription>
                  Prepare a contract for the selected assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Add notes for this contract (optional)"
                  className="mb-4"
                  value={contractNotes}
                  onChange={(e) => setContractNotes(e.target.value)}
                />
                
                <div className="text-sm text-muted-foreground mb-4">
                  <p>Selected assignments: {
                    Object.entries(selectedAssignments)
                      .filter(([_, isSelected]) => isSelected)
                      .length
                  }</p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setSelectedAssignments({})}>
                  Clear Selection
                </Button>
                <Button 
                  onClick={handleCreateContract}
                  disabled={createContractMutation.isPending}
                >
                  {createContractMutation.isPending && <Spinner className="mr-2" size="sm" />}
                  Create Contract
                </Button>
              </CardFooter>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="contracts">
          <div className="mb-4">
            <h2 className="text-xl font-bold mb-2">Contract Management</h2>
            <p className="text-muted-foreground mb-4">
              View and manage musician contracts for this month.
            </p>
          </div>
          
          {!hasAnyContracts() ? (
            <Card>
              <CardHeader>
                <CardTitle>No Contracts</CardTitle>
              </CardHeader>
              <CardContent>
                <p>No contracts have been created for this month yet.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Select the Musicians tab to create contracts.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.values(musicianGroups).map((group: MusicianGroup) => {
                // Skip musicians with no contracts
                if (!group.assignments.some(a => a.contractId)) return null;
                
                const contractGroups = getAssignmentsByContract(group.assignments);
                
                // Skip the unassigned group when rendering the contracts tab
                delete contractGroups['unassigned'];
                
                if (Object.keys(contractGroups).length === 0) return null;
                
                return (
                  <Card key={`contracts-${group.musicianId}`}>
                    <CardHeader className="bg-gray-50">
                      <CardTitle>{group.musicianName}</CardTitle>
                      <CardDescription>
                        {Object.keys(contractGroups).length} {Object.keys(contractGroups).length === 1 ? 'contract' : 'contracts'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <Accordion type="single" collapsible className="w-full">
                        {Object.entries(contractGroups).map(([key, assignments], index) => {
                          // Only process actual contracts (skip 'unassigned')
                          if (key === 'unassigned') return null;
                          
                          const contractId = assignments[0].contractId!;
                          const status = assignments[0].contractStatus || 'pending';
                          const totalFee = assignments.reduce((sum, a) => sum + a.fee, 0);
                          
                          return (
                            <AccordionItem key={key} value={key} className={`rounded-md my-2 ${getStatusColor(status)}`}>
                              <AccordionTrigger className="px-4">
                                <div className="flex flex-1 justify-between items-center pr-4">
                                  <div className="font-medium">
                                    Contract #{contractId}
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <span>${totalFee}</span>
                                    {getStatusBadge(status)}
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4">
                                <table className="w-full mb-4">
                                  <thead className="bg-muted/30">
                                    <tr>
                                      <th className="px-3 py-2 text-left text-sm">Date</th>
                                      <th className="px-3 py-2 text-left text-sm">Time</th>
                                      <th className="px-3 py-2 text-left text-sm">Venue</th>
                                      <th className="px-3 py-2 text-left text-sm">Fee</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {assignments.map(assignment => (
                                      <tr key={assignment.id} className="border-b">
                                        <td className="px-3 py-2 text-sm">{formatDate(assignment.date)}</td>
                                        <td className="px-3 py-2 text-sm">{assignment.startTime} - {assignment.endTime}</td>
                                        <td className="px-3 py-2 text-sm">{assignment.venueName}</td>
                                        <td className="px-3 py-2 text-sm">${assignment.fee}</td>
                                      </tr>
                                    ))}
                                    <tr className="bg-muted/20">
                                      <td colSpan={3} className="px-3 py-2 text-right font-medium">Total:</td>
                                      <td className="px-3 py-2 font-medium">${totalFee}</td>
                                    </tr>
                                  </tbody>
                                </table>
                                
                                <div className="flex gap-2 mt-4">
                                  {status === 'pending' && (
                                    <>
                                      <Button
                                        onClick={() => handleSendContract(contractId)}
                                        disabled={sendContractMutation.isPending}
                                      >
                                        {sendContractMutation.isPending && <Spinner className="mr-2" size="sm" />}
                                        <Mail className="mr-2 h-4 w-4" />
                                        Send Contract
                                      </Button>
                                      <Button
                                        variant="outline"
                                        onClick={() => handleCancelContract(contractId)}
                                        disabled={updateContractStatusMutation.isPending}
                                      >
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Cancel
                                      </Button>
                                    </>
                                  )}
                                  
                                  {status === 'sent' && (
                                    <Button
                                      variant="outline"
                                      onClick={() => handleCancelContract(contractId)}
                                      disabled={updateContractStatusMutation.isPending}
                                    >
                                      <XCircle className="mr-2 h-4 w-4" />
                                      Cancel
                                    </Button>
                                  )}
                                  
                                  {status === 'signed' && (
                                    <Button
                                      variant="outline"
                                      className="bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                                      disabled
                                    >
                                      <CircleCheck className="mr-2 h-4 w-4" />
                                      Signed
                                    </Button>
                                  )}
                                  
                                  {status === 'rejected' && (
                                    <Button
                                      variant="outline"
                                      className="bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
                                      disabled
                                    >
                                      <XCircle className="mr-2 h-4 w-4" />
                                      Rejected
                                    </Button>
                                  )}
                                  
                                  <Button
                                    variant="outline"
                                    className="ml-auto"
                                  >
                                    <FileText className="mr-2 h-4 w-4" />
                                    View Details
                                  </Button>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}