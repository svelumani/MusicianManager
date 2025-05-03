import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Define types for statuses
export interface EntityStatus {
  id: number;
  entityType: string;
  entityId: number;
  primaryStatus: string;
  customStatus?: string;
  statusDate: string;
  eventId: number;
  musicianId?: number;
  eventDate?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

interface StatusUpdateParams {
  entityType: string;
  entityId: number;
  newStatus: string;
  eventId: number;
  musicianId?: number;
  eventDate?: string;
  metadata?: any;
}

// Hook to get status for an entity
export function useEntityStatus(
  entityType: string, 
  entityId: number, 
  eventDate?: string
) {
  const queryKey = ['/api/status', entityType, entityId, eventDate];
  
  return useQuery<EntityStatus>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (eventDate) {
        params.append('eventDate', eventDate);
      }
      
      const response = await fetch(
        `/api/status/${entityType}/${entityId}?${params.toString()}`
      );
      
      if (!response.ok) {
        // If status is 404, the entity doesn't have a status yet
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to fetch status');
      }
      
      return response.json();
    },
    // Don't throw an error for 404 responses
    retry: (failureCount, error: any) => {
      return error?.status !== 404 && failureCount < 3;
    }
  });
}

// Hook to get all statuses for an event
export function useEventStatuses(eventId: number) {
  return useQuery<EntityStatus[]>({
    queryKey: ['/api/status/event', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/status/event/${eventId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch event statuses');
      }
      
      return response.json();
    }
  });
}

// Hook to get statuses for a musician in an event
export function useMusicianEventStatuses(
  eventId: number,
  musicianId: number,
  entityType?: string
) {
  return useQuery<EntityStatus[]>({
    queryKey: ['/api/status/event', eventId, 'musician', musicianId, entityType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (entityType) {
        params.append('entityType', entityType);
      }
      
      const response = await fetch(
        `/api/status/event/${eventId}/musician/${musicianId}?${params.toString()}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch musician event statuses');
      }
      
      return response.json();
    }
  });
}

// Hook to update a status
export function useUpdateStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: StatusUpdateParams) => {
      const response = await apiRequest('/api/status/update', {
        method: 'POST',
        data: params
      });
      
      return response;
    },
    onSuccess: (_, variables) => {
      const { entityType, entityId, eventId, musicianId, eventDate } = variables;
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ 
        queryKey: ['/api/status', entityType, entityId] 
      });
      
      queryClient.invalidateQueries({ 
        queryKey: ['/api/status/event', eventId] 
      });
      
      if (musicianId) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/status/event', eventId, 'musician', musicianId] 
        });
      }
      
      // Success toast
      toast({
        title: 'Status Updated',
        description: `${entityType} status updated successfully.`
      });
    },
    onError: (error: Error) => {
      // Error toast
      toast({
        title: 'Status Update Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

// Helper hook to cancel a contract
export function useCancelContract() {
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
      musicianId?: number;
      eventDate?: string;
      reason?: string;
    }) => {
      const response = await apiRequest(`/api/status/contract/${contractId}/cancel`, {
        method: 'POST',
        data: {
          eventId,
          musicianId,
          eventDate,
          reason
        }
      });
      
      return response;
    },
    onSuccess: (_, variables) => {
      const { contractId, eventId, musicianId } = variables;
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ 
        queryKey: ['/api/status', 'contract', contractId] 
      });
      
      queryClient.invalidateQueries({ 
        queryKey: ['/api/contracts'] 
      });
      
      queryClient.invalidateQueries({ 
        queryKey: ['/api/status/event', eventId] 
      });
      
      if (musicianId) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/status/event', eventId, 'musician', musicianId] 
        });
      }
      
      // Success toast
      toast({
        title: 'Contract Cancelled',
        description: 'The contract has been cancelled successfully.'
      });
    },
    onError: (error: Error) => {
      // Error toast
      toast({
        title: 'Contract Cancellation Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

// Helper hook to sign a contract
export function useSignContract() {
  const queryClient = useQueryClient();
  
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
      const response = await apiRequest(`/api/status/contract/${contractId}/sign`, {
        method: 'POST',
        data: {
          eventId,
          musicianId,
          eventDate,
          signature
        }
      });
      
      return response;
    },
    onSuccess: (_, variables) => {
      const { contractId, eventId, musicianId } = variables;
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ 
        queryKey: ['/api/status', 'contract', contractId] 
      });
      
      queryClient.invalidateQueries({ 
        queryKey: ['/api/contracts'] 
      });
      
      queryClient.invalidateQueries({ 
        queryKey: ['/api/status/event', eventId] 
      });
      
      queryClient.invalidateQueries({ 
        queryKey: ['/api/status/event', eventId, 'musician', musicianId] 
      });
      
      // Success toast
      toast({
        title: 'Contract Signed',
        description: 'The contract has been signed successfully.'
      });
    },
    onError: (error: Error) => {
      // Error toast
      toast({
        title: 'Contract Signing Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

// Hook to track status changes over time for an entity
export function useStatusHistory(
  entityType: string,
  entityId: number,
  eventId: number
) {
  // Get all event statuses
  const { data: eventStatuses, isLoading, error } = useEventStatuses(eventId);
  
  // Filter statuses for the specific entity
  const filteredStatuses = eventStatuses?.filter(
    status => status.entityType === entityType && status.entityId === entityId
  ) || [];
  
  // Sort by status date (newest first)
  const sortedStatuses = [...filteredStatuses].sort(
    (a, b) => new Date(b.statusDate).getTime() - new Date(a.statusDate).getTime()
  );
  
  return {
    statuses: sortedStatuses,
    isLoading,
    error
  };
}