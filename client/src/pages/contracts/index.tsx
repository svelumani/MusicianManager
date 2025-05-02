import { useState } from "react";
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
  MoreHorizontal
} from "lucide-react";
import FileContract from "@/components/icons/FileContract";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

import type { ContractLink, Event, Musician } from "@shared/schema";

// Helper function to get contract status badge
const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { color: string; label: string }> = {
    pending: { color: "bg-yellow-100 text-yellow-800", label: "Pending" },
    accepted: { color: "bg-green-100 text-green-800", label: "Accepted" },
    rejected: { color: "bg-red-100 text-red-800", label: "Rejected" },
    expired: { color: "bg-gray-100 text-gray-800", label: "Expired" }
  };

  const { color, label } = statusMap[status] || { color: "bg-gray-100 text-gray-800", label: status };
  
  return (
    <Badge className={`${color} capitalize`}>
      {label}
    </Badge>
  );
};

export default function ContractsPage() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: contracts, isLoading, refetch } = useQuery<ContractLink[]>({
    queryKey: ["/api/contracts"],
  });
  
  // Mutation for resending a contract
  const resendContractMutation = useMutation({
    mutationFn: async (contractId: number) => {
      return apiRequest(`/api/contracts/${contractId}/resend`, "POST");
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
  
  // Mutation for canceling a contract
  const cancelContractMutation = useMutation({
    mutationFn: async (contractId: number) => {
      return apiRequest(`/api/contracts/${contractId}/cancel`, "POST");
    },
    onSuccess: () => {
      toast({
        title: "Contract canceled",
        description: "The contract has been canceled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
    },
    onError: (error) => {
      toast({
        title: "Error canceling contract",
        description: error.message,
        variant: "destructive",
      });
    }
  });

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

  // Filter contracts based on search and status filter
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
    
    return matchesSearch && matchesStatus;
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
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search contracts by musician or event..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-2">
                  <Filter className="h-4 w-4 mr-2" />
                  {statusFilter ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) : "All Statuses"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setStatusFilter(null)}>
                  All Statuses
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("pending")}>
                  Pending
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("accepted")}>
                  Accepted
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("rejected")}>
                  Rejected
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("expired")}>
                  Expired
                </DropdownMenuItem>
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
                          `$${contract.amount}`
                        ) : (
                          "Not specified"
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(contract.status)}</TableCell>
                      <TableCell>{format(new Date(contract.createdAt), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate(`/contracts/${contract.id}`)}
                        >
                          <FileContract className="h-4 w-4 mr-1" />
                          View
                        </Button>
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
              <p className="text-muted-foreground mb-4 max-w-sm">
                {searchQuery || statusFilter 
                  ? "Try adjusting your search or filter criteria."
                  : "There are no contracts in the system yet. Contracts will appear when musicians receive and respond to them."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}