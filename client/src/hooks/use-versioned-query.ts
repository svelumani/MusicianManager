/**
 * useVersionedQuery - A hook for data fetching with built-in version tracking
 * 
 * This is a wrapper around TanStack Query's useQuery that automatically handles
 * version tracking to ensure data is always fresh regardless of HTTP caching.
 */
import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  VersionedEntity,
  getStoredVersion,
  updateStoredVersion,
  generateVersionHash,
  isDataFresh
} from '@/lib/utils/versionTracker';
import { apiRequest } from '@/lib/queryClient';

interface VersionedQueryOptions<TData> extends Omit<UseQueryOptions<TData>, 'queryKey' | 'queryFn'> {
  // The entity type being fetched
  entity: VersionedEntity;
  // The API endpoint to fetch data from
  endpoint: string;
  // The query parameters to include
  params?: Record<string, string | number>;
  // Whether to force a refresh
  forceRefresh?: boolean;
  // A custom transformation function for the response data
  transform?: (data: any) => TData;
}

/**
 * A hook that combines React Query with version tracking to ensure fresh data
 */
export function useVersionedQuery<TData = any>({
  entity,
  endpoint,
  params = {},
  forceRefresh = false,
  transform,
  ...queryOptions
}: VersionedQueryOptions<TData>) {
  // Local version state
  const [versionHash, setVersionHash] = useState<string>('');
  const queryClient = useQueryClient();

  // Build the full URL with parameters
  const url = buildUrl(endpoint, params);
  
  // Generate a unique query key that includes the entity and version
  const queryKey = [`${entity}:${url}`, versionHash];

  // The actual query
  const queryResult = useQuery<TData>({
    queryKey,
    queryFn: async () => {
      console.log(`🔍 Fetching versioned data for ${entity} from ${url}`);
      
      try {
        // Add a timestamp to the URL to bypass cache
        const timestamp = Date.now();
        const urlWithTimestamp = `${url}${url.includes('?') ? '&' : '?'}_t=${timestamp}`;
        
        // Fetch the data
        const response = await apiRequest(urlWithTimestamp);
        
        // Generate a version hash from the response
        const newVersionHash = generateVersionHash(response);
        console.log(`📊 Generated version hash for ${entity}: ${newVersionHash}`);
        
        // Update the stored version hash
        updateStoredVersion(entity, newVersionHash);
        
        // Set the local version hash
        setVersionHash(newVersionHash);
        
        // Apply any transformation
        return transform ? transform(response) : response;
      } catch (error) {
        console.error(`Error fetching versioned data for ${entity}:`, error);
        throw error;
      }
    },
    ...queryOptions,
  });

  // On mount or when forceRefresh changes, check if data needs to be refreshed
  useEffect(() => {
    const storedVersion = getStoredVersion(entity);
    
    // Force a refresh if requested or if no version exists yet
    if (forceRefresh || !storedVersion) {
      console.log(`🔄 Forcing refresh for ${entity}${forceRefresh ? ' (explicit)' : ' (no stored version)'}`);
      
      // Generate a new unique version hash to force refetch
      const newVersionHash = `force_${Date.now()}`;
      setVersionHash(newVersionHash);
      return;
    }
    
    // If we have data, check if it's fresh
    if (queryResult.data) {
      const dataVersion = generateVersionHash(queryResult.data);
      const isFresh = isDataFresh(entity, dataVersion);
      
      if (!isFresh) {
        console.log(`🔄 Data is stale for ${entity}, refreshing...`);
        setVersionHash(dataVersion);
        queryClient.invalidateQueries({ queryKey: [entity] });
      }
    } else {
      // If no data yet, use the stored version
      setVersionHash(storedVersion);
    }
  }, [entity, forceRefresh, queryResult.data, queryClient]);

  return {
    ...queryResult,
    // Add extra properties
    isVersioned: true,
    currentVersion: versionHash,
    // Function to force a refresh regardless of version
    forceRefresh: () => {
      const newVersionHash = `force_${Date.now()}`;
      setVersionHash(newVersionHash);
      queryClient.invalidateQueries({ queryKey });
    }
  };
}

/**
 * Helper to build a URL with query parameters
 */
function buildUrl(endpoint: string, params: Record<string, string | number>): string {
  if (Object.keys(params).length === 0) {
    return endpoint;
  }
  
  const queryParams = Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
    
  return `${endpoint}${endpoint.includes('?') ? '&' : '?'}${queryParams}`;
}