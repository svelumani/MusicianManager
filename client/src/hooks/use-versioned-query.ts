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
import { 
  initWebSocketConnection, 
  onDataUpdate, 
  UpdateEntity,
  convertToClientEntity
} from '@/lib/ws/dataSync';

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
      // First, get the current server data version
      const versionsResponse = await fetch('/api/versions', {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!versionsResponse.ok) {
        console.warn('Failed to fetch versions, proceeding with data fetch anyway');
      } else {
        // Get raw server versions
        const serverVersions = await versionsResponse.json();
        
        // Map server version keys to client entity names
        const clientVersions = mapServerVersionsToClient(serverVersions);
        
        // Get server key for this entity
        const serverKey = getServerKeyForEntity(entity as string);
        
        // Get version value from mapped client versions
        const versionValue = clientVersions[entity as string];
        
        console.log(`[VersionedQuery] ${entity} data version: ${versionValue || 'unknown'} (server key: ${serverKey})`);
      }
      
      // Construct the URL with a cache-busting timestamp
      const timestamp = Date.now();
      const url = endpoint + 
        (endpoint.includes('?') ? '&' : '?') + 
        new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString() +
        `&_t=${timestamp}`;
      
      // Fetch data from API with no-cache headers
      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache'
        }
      });
        
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Log data for debugging
      console.log(`[VersionedQuery] ${entity} data fetched at ${new Date().toISOString()}`);
      
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
      // Convert both entities to standardized client format
      const normalizedUpdatedEntity = convertToClientEntity(updatedEntity);
      const normalizedThisEntity = convertToClientEntity(entity);
      
      // Determine if we should refresh based on the updated entity
      const shouldRefresh = 
        updatedEntity === 'all' || 
        normalizedUpdatedEntity === normalizedThisEntity;
      
      if (shouldRefresh) {
        // Only refresh if it's not the first query (to prevent double fetching on mount)
        if (!isFirstQuery.current) {
          result.forceRefresh();
          console.log(`Refreshing ${normalizedThisEntity} data due to version change in ${updatedEntity} (normalized to ${normalizedUpdatedEntity})`);
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
      // Map the updated entity to client format if it's a server key
      const clientUpdatedEntity = mapServerVersionsToClient({ [updatedEntity as string]: 1 });
      const normalizedUpdatedEntity = Object.keys(clientUpdatedEntity)[0] || updatedEntity;
      
      // Check for a match with normalized entity names
      const isMatch = 
        updatedEntity === 'all' || 
        entityTypes === 'all' || 
        (Array.isArray(entityTypes) && (
          entityTypes.includes(updatedEntity) || 
          entityTypes.includes(normalizedUpdatedEntity as UpdateEntity)
        ));
        
      if (isMatch) {
        hasUpdates.current = true;
        
        if (onUpdate) {
          // Send the normalized entity name to ensure consistency
          onUpdate(normalizedUpdatedEntity as UpdateEntity);
        }
      }
    };
    
    // Register the data update handler
    const cleanup = onDataUpdate(handleDataUpdate);
    
    return cleanup;
  }, [entityTypes, onUpdate]);
  
  return hasUpdates.current;
}