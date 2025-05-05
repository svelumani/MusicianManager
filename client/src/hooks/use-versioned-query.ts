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
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { initWebSocketConnection } from '@/lib/ws/dataSync';
import { queryClient } from '@/lib/queryClient';

// Map of version keys to their latest known version numbers
const knownVersions: Record<string, number> = {};

/**
 * Custom hook that extends useQuery with version checking to ensure data freshness
 */
export function useVersionedQuery<T>(
  endpoint: string,
  versionKey: string,
  options?: Omit<UseQueryOptions<T>, 'queryKey'>
): UseQueryResult<T> {
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);
  
  // Initialize WebSocket connection if not already connected
  useEffect(() => {
    initWebSocketConnection();
  }, []);

  // First, get the current version to use as a dependency for the data query
  const versionQuery = useQuery({
    queryKey: ['/api/versions'],
    refetchOnWindowFocus: true,
    refetchInterval: 60000, // Fallback polling every minute in case WebSocket fails
    ...options
  });

  // Update the current version when version data changes
  useEffect(() => {
    if (versionQuery.data && versionKey in versionQuery.data) {
      const newVersion = versionQuery.data[versionKey];
      
      // Check if this is a new version
      if (knownVersions[versionKey] !== newVersion) {
        console.log(`New version detected for ${versionKey}: ${newVersion}`);
        
        // Update the known version
        knownVersions[versionKey] = newVersion;
        
        // Invalidate related queries if needed
        if (currentVersion !== null && newVersion > currentVersion) {
          queryClient.invalidateQueries({ queryKey: [endpoint] });
        }
        
        setCurrentVersion(newVersion);
      }
    }
  }, [versionQuery.data, versionKey, endpoint, currentVersion]);

  // Then fetch the actual data, using the version as part of the query key
  return useQuery({
    queryKey: [endpoint, currentVersion],
    enabled: currentVersion !== null, // Only fetch when we have a version
    ...options
  });
}

/**
 * Hook to check if any data has been updated recently
 */
export function useRecentDataUpdates(
  timeWindowMs: number = 5000
): boolean {
  const [hasRecentUpdates, setHasRecentUpdates] = useState(false);
  
  const versionQuery = useQuery({
    queryKey: ['/api/versions'],
    refetchInterval: 30000,
  });
  
  useEffect(() => {
    if (versionQuery.data) {
      const versions = versionQuery.data;
      const now = Date.now();
      
      // Check if any versions have been updated recently
      let updated = false;
      for (const key in versions) {
        if (knownVersions[key] !== undefined && knownVersions[key] !== versions[key]) {
          knownVersions[key] = versions[key];
          updated = true;
          console.log(`Data updated: ${key} (version ${versions[key]})`);
        } else if (knownVersions[key] === undefined) {
          // Initialize if this is the first time seeing this version
          knownVersions[key] = versions[key];
        }
      }
      
      if (updated) {
        setHasRecentUpdates(true);
        
        // Reset after the time window
        const timeout = setTimeout(() => {
          setHasRecentUpdates(false);
        }, timeWindowMs);
        
        return () => clearTimeout(timeout);
      }
    }
  }, [versionQuery.data, timeWindowMs]);
  
  return hasRecentUpdates;
}