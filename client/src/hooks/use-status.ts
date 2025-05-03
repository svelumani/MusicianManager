import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";

// Status configuration types
interface StatusConfig {
  entityType: string;
  statuses: {
    value: string;
    label: string;
    description: string;
    colorType: string;
    colorClass: string;
  }[];
  getColorClass: (status: string) => string;
  getDescription: (status: string) => string;
}

/**
 * Hook to get entity status configuration
 */
export function useEntityStatusConfig(entityType: string) {
  return useQuery({
    queryKey: ["/api/status/config", entityType],
    queryFn: async () => {
      const response = await fetch(`/api/status/config?entityType=${entityType}`);
      if (!response.ok) {
        throw new Error("Failed to fetch status configuration");
      }
      const config = await response.json();
      
      // Add utility methods
      return {
        ...config,
        getColorClass: (status: string) => {
          const statusInfo = config.statuses.find((s: any) => s.value === status);
          return statusInfo?.colorClass || "";
        },
        getDescription: (status: string) => {
          const statusInfo = config.statuses.find((s: any) => s.value === status);
          return statusInfo?.description || "";
        }
      };
    },
    staleTime: 300000 // Cache for 5 minutes
  });
}

/**
 * Hook to get current status for an entity
 */
export function useEntityStatus(entityType: string, entityId: number, eventId?: number) {
  return useQuery({
    queryKey: ["/api/status", entityType, entityId, eventId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('entityType', entityType);
      params.append('entityId', entityId.toString());
      
      if (eventId) {
        params.append('eventId', eventId.toString());
      }
      
      const response = await fetch(`/api/status?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch status");
      }
      return response.json();
    },
    enabled: !!entityId,
    staleTime: 30000 // Cache for 30 seconds
  });
}

/**
 * Hook to update status for an entity
 */
export function useUpdateEntityStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ 
      entityType, 
      entityId, 
      status, 
      eventId,
      details 
    }: { 
      entityType: string; 
      entityId: number; 
      status: string; 
      eventId?: number;
      details?: string;
    }) => {
      const response = await fetch('/api/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entityType,
          entityId,
          status,
          eventId,
          details
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update status");
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Status Updated",
        description: `Status has been updated successfully.`,
      });
      
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: ["/api/status", variables.entityType, variables.entityId, variables.eventId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/status/history", variables.entityType, variables.entityId, variables.eventId] 
      });
      
      // Invalidate related entity queries (e.g., if we update a contract status, refresh contracts list)
      switch (variables.entityType) {
        case 'contract':
          queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
          queryClient.invalidateQueries({ queryKey: ["/api/contracts", variables.entityId] });
          break;
        case 'musician':
          queryClient.invalidateQueries({ queryKey: ["/api/musicians"] });
          queryClient.invalidateQueries({ queryKey: ["/api/musicians", variables.entityId] });
          break;
        case 'event':
          queryClient.invalidateQueries({ queryKey: ["/api/events"] });
          queryClient.invalidateQueries({ queryKey: ["/api/events", variables.entityId] });
          break;
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to Update Status",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  });
}

/**
 * Hook to sign a contract (specialized status update)
 */
export function useSignContract() {
  const updateStatus = useUpdateEntityStatus();
  
  return useMutation({
    mutationFn: async ({ 
      contractId, 
      eventId, 
      musicianId, 
      eventDate, 
      signature 
    }: { 
      contractId: number; 
      eventId: number; 
      musicianId: number; 
      eventDate?: string;
      signature: string;
    }) => {
      // First update the contract with the signature
      const signResponse = await fetch(`/api/contracts/${contractId}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          signature,
          eventDate
        })
      });
      
      if (!signResponse.ok) {
        const error = await signResponse.json();
        throw new Error(error.message || "Failed to sign contract");
      }
      
      // Then update the status
      return updateStatus.mutateAsync({
        entityType: 'contract',
        entityId: contractId,
        status: 'contract-signed',
        eventId,
        details: `Contract signed with signature: ${signature}`
      });
    }
  });
}

/**
 * Hook to cancel a contract (specialized status update)
 */
export function useCancelContract() {
  const updateStatus = useUpdateEntityStatus();
  
  return useMutation({
    mutationFn: async ({ 
      contractId, 
      eventId, 
      musicianId, 
      eventDate, 
      reason 
    }: { 
      contractId: number; 
      eventId: number; 
      musicianId: number; 
      eventDate?: string;
      reason?: string;
    }) => {
      // First cancel the contract
      const cancelResponse = await fetch(`/api/contracts/${contractId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason,
          eventDate
        })
      });
      
      if (!cancelResponse.ok) {
        const error = await cancelResponse.json();
        throw new Error(error.message || "Failed to cancel contract");
      }
      
      // Then update the status
      return updateStatus.mutateAsync({
        entityType: 'contract',
        entityId: contractId,
        status: 'cancelled',
        eventId,
        details: reason ? `Contract cancelled. Reason: ${reason}` : 'Contract cancelled'
      });
    }
  });
}