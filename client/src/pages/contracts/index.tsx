import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { 
  Search, 
  CalendarDays, 
  Loader2,
  Filter,
  MailPlus,
  XCircle,
  MoreHorizontal,
  Info
} from "lucide-react";
import FileContract from "@/components/icons/FileContract";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import StatusBadge from "@/components/StatusBadge";
import { useCancelContract, useUpdateEntityStatus } from "@/hooks/use-status";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { ContractLink, Event, Musician } from "@shared/schema";

// Helper function to get contract status badge
const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { color: string; label: string }> = {
    pending: { color: "bg-yellow-100 text-yellow-800", label: "Pending" },
    accepted: { color: "bg-green-100 text-green-800", label: "Accepted" },
    rejected: { color: "bg-red-100 text-red-800", label: "Rejected" },
    expired: { color: "bg-gray-100 text-gray-800", label: "Expired" },
    cancelled: { color: "bg-red-100 text-red-800", label: "Contract Cancelled" },
    "contract-sent": { color: "bg-blue-100 text-blue-800", label: "Contract Sent" },
    "contract-signed": { color: "bg-green-100 text-green-800", label: "Contract Signed" }
  };

  const { color, label } = statusMap[status] || { color: "bg-gray-100 text-gray-800", label: status };
  
  return (
    <Badge className={`${color} capitalize`}>
      {label}
    </Badge>
  );
};

// Status definition for the legend
const contractStatuses = [
  { id: "pending", label: "Pending", color: "bg-yellow-100 text-yellow-800", description: "Contract is created but not yet sent to musician" },
  { id: "contract-sent", label: "Contract Sent", color: "bg-blue-100 text-blue-800", description: "Contract has been sent to musician, awaiting response" },
  { id: "contract-signed", label: "Contract Signed", color: "bg-green-100 text-green-800", description: "Musician has signed the contract" },
  { id: "accepted", label: "Accepted", color: "bg-green-100 text-green-800", description: "Contract has been accepted by musician" },
  { id: "rejected", label: "Rejected", color: "bg-red-100 text-red-800", description: "Contract has been rejected by musician" },
  { id: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-800", description: "Contract has been cancelled" },
  { id: "expired", label: "Expired", color: "bg-gray-100 text-gray-800", description: "Contract link has expired" }
];

export default function ContractsPage() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [eventFilter, setEventFilter] = useState<number | null>(null);
  const [showLegend, setShowLegend] = useState(true);
  const { toast } = useToast();

  const { data: contracts, isLoading, refetch } = useQuery<ContractLink[]>({
    queryKey: ["/api/contracts"],
  });
  
  // Mutation for resending a contract
  const resendContractMutation = useMutation({
    mutationFn: async (contractId: number) => {
      try {
        console.log(`Resending contract with ID: ${contractId}`);
        const response = await fetch(`/api/contracts/${contractId}/resend`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log("Resend contract response status:", response.status, response.statusText);
        
        if (!response.ok) {
          try {
            const errorText = await response.text();
            console.log("Error response text:", errorText);
            
            let errorData;
            try {
              errorData = JSON.parse(errorText);
              throw new Error(errorData.details || errorData.message || `Failed to resend contract (${response.status})`);
            } catch (parseError) {
              console.error("Failed to parse error response:", parseError);
              throw new Error(`Failed to resend contract: Server error (${response.status})`);
            }
          } catch (e) {
            console.error("Error handling contract resend response:", e);
            throw new Error(`Failed to resend contract: ${e.message}`);
          }
        }
        
        const responseData = await response.json();
        console.log("Successful contract resend response:", responseData);
        return responseData;
      } catch (err) {
        console.error("Contract resend request error:", err);
        throw err;
      }
    },
    onSuccess: () => {
      toast({
        title: "Contract resent",
        description: "The contract has been resent to the musician.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
    },
    onError: (error) => {
      toast({
        title: "Error resending contract",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Use the new status hook for canceling contracts
  const cancelContractMutation = useCancelContract();

  const { data: musicians } = useQuery<Musician[]>({
    queryKey: ["/api/musicians"],
  });

  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  // Function to get musician name by ID
  const getMusicianName = (musicianId: number) => {
    const musician = musicians?.find(m => m.id === musicianId);
    return musician ? musician.name : "Unknown Musician";
  };

  // Function to get event name by ID
  const getEventName = (eventId: number) => {
    const event = events?.find(e => e.id === eventId);
    return event ? event.name : "Unknown Event";
  };

  // Get unique event list for filter dropdown
  const eventOptions = events ? 
    [...new Set(contracts?.map(c => c.eventId))]
      .map(eventId => events.find(e => e.id === eventId))
      .filter(Boolean) as Event[]
    : [];

  // Filter contracts based on search, status filter, and event filter
  const filteredContracts = contracts?.filter(contract => {
    const musicianName = getMusicianName(contract.musicianId);
    const eventName = getEventName(contract.eventId);
    
    const matchesSearch = 
      searchQuery === "" || 
      musicianName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eventName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === null || 
      contract.status === statusFilter;
    
    const matchesEvent =
      eventFilter === null ||
      contract.eventId === eventFilter;
    
    return matchesSearch && matchesStatus && matchesEvent;
  });

  // Sort contracts by created date (newest first)
  const sortedContracts = filteredContracts?.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contracts</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Contract Management</CardTitle>
          <CardDescription>
            Manage musician contracts, view status, and track signatures
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Status Legend */}
          {showLegend && (
            <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium flex items-center">
                  <Info className="h-4 w-4 mr-1" /> 
                  Contract Status Legend
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowLegend(false)}
                  className="h-6 w-6 p-0"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {contractStatuses.map(status => (
                  <div key={status.id} className="flex items-center">
                    <Badge className={`${status.color} mr-2`}>{status.label}</Badge>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-[200px] text-xs">{status.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="mb-6 flex flex-col sm:flex-row gap-2">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search contracts by musician or event..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={eventFilter?.toString() || ""} onValueChange={(value) => setEventFilter(value ? parseInt(value) : null)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Events</SelectItem>
                {eventOptions.map(event => (
                  <SelectItem key={event.id} value={event.id.toString()}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Filter className="h-4 w-4 mr-2" />
                  {statusFilter ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1).replace('-', ' ') : "All Statuses"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setStatusFilter(null)}>
                  All Statuses
                </DropdownMenuItem>
                {contractStatuses.map(status => (
                  <DropdownMenuItem key={status.id} onClick={() => setStatusFilter(status.id)}>
                    <Badge className={`${status.color} mr-2`}>{status.label}</Badge>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {sortedContracts && sortedContracts.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Musician</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedContracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell className="font-medium">{contract.id}</TableCell>
                      <TableCell>{getMusicianName(contract.musicianId)}</TableCell>
                      <TableCell>{getEventName(contract.eventId)}</TableCell>
                      <TableCell>
                        {contract.eventDate ? (
                          <div className="flex items-center">
                            <CalendarDays className="h-4 w-4 mr-1 text-muted-foreground" />
                            {format(new Date(contract.eventDate), "MMM d, yyyy")}
                          </div>
                        ) : (
                          "Not specified"
                        )}
                      </TableCell>
                      <TableCell>
                        {contract.amount ? (
                          `$${contract.amount.toFixed(2)}`
                        ) : (
                          "Not specified"
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge 
                          status={contract.status} 
                          entityType="contract"
                          entityId={contract.id}
                          eventId={contract.eventId}
                          musicianId={contract.musicianId}
                          eventDate={contract.eventDate ? new Date(contract.eventDate).toISOString() : undefined}
                          timestamp={contract.createdAt}
                          useCentralizedSystem={true}
                        />
                      </TableCell>
                      <TableCell>{format(new Date(contract.createdAt), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/contracts/${contract.id}`)}
                            title="View Contract"
                          >
                            <FileContract className="h-4 w-4" />
                          </Button>
                          
                          {contract.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resendContractMutation.mutate(contract.id)}
                              disabled={resendContractMutation.isPending}
                              title="Resend Contract"
                            >
                              <MailPlus className="h-4 w-4 text-blue-500" />
                            </Button>
                          )}
                          
                          {contract.status !== "accepted" && contract.status !== "rejected" && contract.status !== "cancelled" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => cancelContractMutation.mutate({
                                contractId: contract.id,
                                eventId: contract.eventId,
                                musicianId: contract.musicianId,
                                eventDate: contract.eventDate ? contract.eventDate.toString() : undefined
                              })}
                              disabled={cancelContractMutation.isPending}
                              title="Cancel Contract"
                            >
                              <XCircle className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileContract className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No contracts found</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                {searchQuery || statusFilter || eventFilter 
                  ? "Try adjusting your search or filter criteria."
                  : "There are no contracts in the system yet. Contracts will appear here when musicians receive and respond to event invitations."}
              </p>
              
              {!showLegend && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowLegend(true)}
                  className="flex items-center"
                >
                  <Info className="h-4 w-4 mr-2" />
                  Show contract status guide
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}