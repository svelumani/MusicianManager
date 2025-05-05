/**
 * Versioned Query Hook
 * 
 * This custom hook extends React Query with version-aware caching
 * that integrates with the server's data versioning system.
 * 
 * It allows components to automatically refresh their data when
 * the server indicates that newer data is available, without relying
 * on polling or manual refreshes.
 */
import { useEffect, useRef } from 'react';
import { 
  useQuery, 
  UseQueryOptions, 
  UseQueryResult 
} from '@tanstack/react-query';
import { initWebSocketConnection, onDataUpdate, UpdateEntity } from '@/lib/ws/dataSync';

/**
 * Custom hook that extends useQuery with version checking to ensure data freshness
 */
export function useVersionedQuery<T>(
  queryKey: string[],
  options?: UseQueryOptions<T>,
  entityType?: UpdateEntity
): UseQueryResult<T> {
  // Initialize websocket connection
  useEffect(() => {
    initWebSocketConnection();
  }, []);
  
  // Use ref to track if this is the first query
  const isFirstQuery = useRef(true);
  
  // Use standard React Query hook
  const query = useQuery<T>({
    ...(options || {}),
    queryKey,
    staleTime: 0, // Always consider data stale for versioned entities
  });
  
  // Set up data update listener
  useEffect(() => {
    if (!entityType) return;
    
    const handleDataUpdate = (updatedEntity: UpdateEntity) => {
      if (updatedEntity === 'all' || updatedEntity === entityType) {
        // Only refresh if it's not the first query (to prevent double fetching on mount)
        if (!isFirstQuery.current) {
          query.refetch();
          console.log(`Refreshing ${entityType} data due to version change`);
        }
      }
    };
    
    // Register the data update handler
    const cleanup = onDataUpdate(handleDataUpdate);
    
    // Mark first query as completed after initial render
    isFirstQuery.current = false;
    
    return cleanup;
  }, [entityType, query]);
  
  return query;
}

/**
 * Hook to check if any data has been updated recently
 */
export function useRecentDataUpdates(
  entityTypes: UpdateEntity[] | 'all' = 'all',
  onUpdate?: (entity: UpdateEntity) => void
): boolean {
  const hasUpdates = useRef(false);
  
  // Initialize websocket connection
  useEffect(() => {
    initWebSocketConnection();
    
    const handleDataUpdate = (updatedEntity: UpdateEntity) => {
      if (
        updatedEntity === 'all' || 
        entityTypes === 'all' || 
        (Array.isArray(entityTypes) && entityTypes.includes(updatedEntity))
      ) {
        hasUpdates.current = true;
        
        if (onUpdate) {
          onUpdate(updatedEntity);
        }
      }
    };
    
    // Register the data update handler
    const cleanup = onDataUpdate(handleDataUpdate);
    
    return cleanup;
  }, [entityTypes, onUpdate]);
  
  return hasUpdates.current;
}