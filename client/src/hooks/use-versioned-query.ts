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
  config: {
    entity: UpdateEntity;
    endpoint: string;
    params?: Record<string, any>;
    transform?: (data: any) => T;
    enabled?: boolean;
    [key: string]: any;
  }
): UseQueryResult<T> & { forceRefresh: () => Promise<T> } {
  const { entity, endpoint, params = {}, transform, enabled = true, ...restOptions } = config;
  
  // Construct query key from endpoint and params
  const queryKey = [endpoint, ...(Object.keys(params).length > 0 ? [params] : [])];
  // Initialize websocket connection
  useEffect(() => {
    initWebSocketConnection();
  }, []);
  
  // Use ref to track if this is the first query
  const isFirstQuery = useRef(true);
  
  // Construct fetch function with API request
  const fetchFn = async () => {
    try {
      // Fetch data from API
      const response = await fetch(endpoint + (endpoint.includes('?') ? '&' : '?') + 
        new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString());
        
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transform data if transform function is provided
      return transform ? transform(data) : data;
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      throw error;
    }
  };
  
  // Use standard React Query hook
  const query = useQuery<T>({
    queryKey,
    queryFn: fetchFn,
    staleTime: 0, // Always consider data stale for versioned entities
    enabled,
    ...restOptions
  });
  
  // Create the enhanced result object with forceRefresh method
  const result = Object.assign({}, query, {
    forceRefresh: async () => {
      console.log(`Force refreshing ${entity} data`);
      const data = await query.refetch();
      return data.data as T;
    }
  }) as UseQueryResult<T> & { forceRefresh: () => Promise<T> };
  
  // Set up data update listener
  useEffect(() => {
    if (!enabled) return;
    
    const handleDataUpdate = (updatedEntity: UpdateEntity) => {
      if (updatedEntity === 'all' || updatedEntity === entity) {
        // Only refresh if it's not the first query (to prevent double fetching on mount)
        if (!isFirstQuery.current) {
          result.forceRefresh();
          console.log(`Refreshing ${entity} data due to version change`);
        }
      }
    };
    
    // Register the data update handler
    const cleanup = onDataUpdate(handleDataUpdate);
    
    // Mark first query as completed after initial render
    setTimeout(() => {
      isFirstQuery.current = false;
    }, 500);
    
    return cleanup;
  }, [entity, query, enabled]);
  
  return result;
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