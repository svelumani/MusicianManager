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
 * 
 * This hook provides an enhanced status lookup from the centralized status system
 * with fallback to legacy status for backward compatibility.
 */
export function useEntityStatus(
  entityType: string, 
  entityId: number, 
  eventId?: number,
  musicianId?: number,
  eventDate?: string
) {
  // Use the query client for direct access to cache
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: ["/api/status", entityType, entityId, eventId, musicianId, eventDate],
    queryFn: async () => {
      if (!entityId) {
        throw new Error("Entity ID is required");
      }
      
      const params = new URLSearchParams();
      params.append('entityType', entityType);
      params.append('entityId', entityId.toString());
      
      if (eventId) {
        params.append('eventId', eventId.toString());
      }
      
      if (musicianId) {
        params.append('musicianId', musicianId.toString());
      }
      
      if (eventDate) {
        params.append('eventDate', eventDate);
      }
      
      try {
        // Try to get status from the centralized system
        const response = await fetch(`/api/status?${params.toString()}`);
        
        if (response.ok) {
          const statusData = await response.json();
          console.log(`Status from centralized system for ${entityType} #${entityId}:`, statusData);
          
          return {
            ...statusData,
            // Add a flag to indicate this came from the centralized system
            source: 'centralized'
          };
        } else if (response.status === 404) {
          console.log(`No status found in centralized system for ${entityType} #${entityId}, will try legacy status`);
          
          // Fall back to legacy status sources
          try {
            // Try to get legacy status from the appropriate endpoint
            // This can be expanded based on entity type
            let legacyStatusData;
            
            if (entityType === 'contract') {
              // Get the contract from cache or fetch it
              const contractCache = queryClient.getQueryData<any>(["/api/contracts"]);
              
              if (contractCache) {
                const contract = contractCache.find((c: any) => c.id === entityId);
                if (contract) {
                  legacyStatusData = {
                    id: 0, // Synthesized ID
                    entityType: 'contract',
                    entityId: entityId,
                    status: contract.status,
                    customStatus: null,
                    eventId: contract.eventId,
                    musicianId: contract.musicianId,
                    eventDate: contract.eventDate,
                    // Use contract timestamps
                    statusDate: contract.updatedAt || contract.createdAt,
                    createdAt: contract.createdAt,
                    updatedAt: contract.updatedAt,
                    // Add metadata to indicate this is from legacy system
                    metadata: {
                      legacySource: true,
                      bookingId: contract.bookingId,
                      invitationId: contract.invitationId
                    },
                    // Flag indicating this is from legacy system
                    source: 'legacy'
                  };
                  
                  console.log(`Using legacy status from contract cache:`, legacyStatusData);
                  return legacyStatusData;
                }
              }
              
              // If not in cache, fetch directly
              const contractResponse = await fetch(`/api/contracts/${entityId}`);
              if (contractResponse.ok) {
                const contract = await contractResponse.json();
                legacyStatusData = {
                  id: 0,
                  entityType: 'contract',
                  entityId: entityId,
                  status: contract.status,
                  customStatus: null,
                  eventId: contract.eventId,
                  musicianId: contract.musicianId,
                  eventDate: contract.eventDate,
                  statusDate: contract.updatedAt || contract.createdAt,
                  createdAt: contract.createdAt,
                  updatedAt: contract.updatedAt,
                  metadata: {
                    legacySource: true,
                    bookingId: contract.bookingId,
                    invitationId: contract.invitationId
                  },
                  source: 'legacy'
                };
                
                console.log(`Using legacy status from contract API:`, legacyStatusData);
                return legacyStatusData;
              }
            } else if (entityType === 'musician' && eventId) {
              // Try to get event data which contains musician status
              const eventCache = queryClient.getQueryData<any>(["/api/events", eventId]);
              let event = eventCache;
              
              if (!event) {
                const eventResponse = await fetch(`/api/events/${eventId}`);
                if (eventResponse.ok) {
                  event = await eventResponse.json();
                }
              }
              
              if (event && event.musicianStatuses && typeof musicianId === 'number') {
                // Look for status in musicianStatuses using string conversion for object indexing
                const musicianIdKey = musicianId.toString();
                const status = musicianIdKey in event.musicianStatuses 
                  ? event.musicianStatuses[musicianIdKey] 
                  : undefined;
                if (status) {
                  legacyStatusData = {
                    id: 0,
                    entityType: 'musician',
                    entityId: musicianId,
                    status: status,
                    customStatus: null,
                    eventId: eventId,
                    musicianId: musicianId,
                    eventDate: eventDate,
                    statusDate: event.updatedAt || event.createdAt,
                    createdAt: event.createdAt,
                    updatedAt: event.updatedAt,
                    metadata: {
                      legacySource: true,
                      eventName: event.name
                    },
                    source: 'legacy'
                  };
                  
                  console.log(`Using legacy status from event's musicianStatuses:`, legacyStatusData);
                  return legacyStatusData;
                }
              }
            }
            
            // If we reach here, we couldn't find status information
            return {
              id: 0,
              entityType,
              entityId,
              status: 'unknown',
              customStatus: null,
              eventId: eventId || null,
              musicianId: musicianId || null,
              eventDate: eventDate || null,
              statusDate: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              metadata: {
                legacySource: true,
                noStatusFound: true
              },
              source: 'unknown'
            };
          } catch (legacyError) {
            console.error(`Error getting legacy status:`, legacyError);
            throw new Error(`Failed to get status for ${entityType} #${entityId}`);
          }
        } else {
          // For other errors, propagate them
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to fetch status for ${entityType} #${entityId}`);
        }
      } catch (error) {
        console.error(`Error in useEntityStatus:`, error);
        throw error;
      }
    },
    enabled: !!entityId,
    staleTime: 30000, // Cache for 30 seconds
    retry: 1 // Only retry once - we don't want to spam the API if it's failing
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
      details,
      customStatus,
      musicianId,
      eventDate,
      metadata
    }: { 
      entityType: string; 
      entityId: number; 
      status: string; 
      eventId?: number;
      details?: string;
      customStatus?: string;
      musicianId?: number;
      eventDate?: string;
      metadata?: any;
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
          details,
          customStatus,
          musicianId,
          eventDate,
          metadata
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
      
      // Invalidate all possible query combinations
      queryClient.invalidateQueries({ 
        queryKey: ["/api/status", variables.entityType, variables.entityId] 
      });
      
      // Invalidate with eventId combinations
      if (variables.eventId) {
        queryClient.invalidateQueries({ 
          queryKey: ["/api/status", variables.entityType, variables.entityId, variables.eventId] 
        });
      }
      
      // Invalidate with musician combinations
      if (variables.musicianId) {
        queryClient.invalidateQueries({ 
          queryKey: ["/api/status", variables.entityType, variables.entityId, variables.eventId, variables.musicianId] 
        });
      }
      
      // Invalidate history queries
      queryClient.invalidateQueries({ 
        queryKey: ["/api/status/history", variables.entityType, variables.entityId] 
      });
      
      if (variables.eventId) {
        queryClient.invalidateQueries({ 
          queryKey: ["/api/status/history", variables.entityType, variables.entityId, variables.eventId] 
        });
      }
      
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
        case 'booking':
          queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
          queryClient.invalidateQueries({ queryKey: ["/api/bookings", variables.entityId] });
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
      
      // Then update the status with all the proper parameters
      return updateStatus.mutateAsync({
        entityType: 'contract',
        entityId: contractId,
        status: 'contract-signed',
        eventId,
        musicianId,
        eventDate,
        customStatus: 'musician-signed',
        details: `Contract signed with signature: ${signature}`,
        metadata: {
          signedAt: new Date().toISOString(),
          signedBy: 'Musician',
          signatureType: 'digital',
          signatureValue: signature
        }
      });
    }
  });
}

/**
 * Hook to cancel a contract (specialized status update)
 */
export function useCancelContract() {
  const updateStatus = useUpdateEntityStatus();
  const queryClient = useQueryClient();
  
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
      console.log(`Cancelling contract #${contractId} for musician #${musicianId} at event #${eventId}${eventDate ? ` on ${eventDate}` : ''}`);
      
      // First cancel the contract via API
      const cancelResponse = await fetch(`/api/contracts/${contractId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason,
          eventId,
          musicianId,
          eventDate: eventDate // Make sure we explicitly pass the eventDate
        })
      });
      
      if (!cancelResponse.ok) {
        const error = await cancelResponse.json();
        throw new Error(error.message || "Failed to cancel contract");
      }
      
      const cancelResult = await cancelResponse.json();
      console.log("Contract cancel API response:", cancelResult);
      
      // Then update the contract status in the centralized system
      const contractStatusResult = await updateStatus.mutateAsync({
        entityType: 'contract',
        entityId: contractId,
        status: 'cancelled',
        eventId,
        musicianId,
        eventDate,
        customStatus: 'user-cancelled',
        details: reason ? `Contract cancelled. Reason: ${reason}` : 'Contract cancelled',
        metadata: {
          cancelledAt: new Date().toISOString(),
          reason: reason || 'No reason provided',
          cancelledBy: 'User',
          eventDate: eventDate
        }
      });
      
      console.log("Contract status update result:", contractStatusResult);
      
      // Now also update the musician's status for this event
      // This ensures the booking is properly marked as cancelled
      try {
        const musicianStatusResult = await updateStatus.mutateAsync({
          entityType: 'musician',
          entityId: musicianId,
          status: 'cancelled',
          eventId,
          eventDate,
          customStatus: 'contract-cancelled',
          details: `Booking cancelled due to contract cancellation${reason ? `. Reason: ${reason}` : ''}`,
          metadata: {
            contractId,
            cancelledAt: new Date().toISOString(),
            reason: reason || 'No reason provided',
            cancelledBy: 'User',
            eventDate: eventDate
          }
        });
        
        console.log("Musician status update result:", musicianStatusResult);
        
        // Invalidate all related caches to ensure UI refresh
        queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/events"] });
        queryClient.invalidateQueries({ queryKey: ["/api/musicians"] });
        queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
        queryClient.invalidateQueries({ queryKey: ["/api/status"] });
        queryClient.invalidateQueries({ queryKey: ["/api/status/history"] });
        
        return { 
          ...contractStatusResult, 
          musicianStatus: musicianStatusResult 
        };
      } catch (musicianStatusError) {
        console.error("Error updating musician status during contract cancellation:", musicianStatusError);
        
        // Return the contract result even if musician status update fails
        // We don't want to fail the entire operation if just this part fails
        return contractStatusResult;
      }
    }
  });
}