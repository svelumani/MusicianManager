/**
 * Force Refresh Utilities
 * 
 * This module provides functions to ensure we always have fresh data
 * by forcing complete page reloads with appropriate context preservation.
 */
import { queryClient } from "@/lib/queryClient";

/**
 * Handles any URL-related navigation to ensure it uses the correct paths
 * This mapping function converts any old path patterns to the new correct ones
 */
export function getCorrectPath(path: string): string {
  // Map of old paths to new correct paths
  const pathMappings: Record<string, string> = {
    '/planner': '/events/planner',
    '/planner/': '/events/planner/',
    '/planner/index': '/events/planner',
  };
  
  // Check if the path needs to be remapped
  return pathMappings[path] || path;
}

/**
 * Forces a complete page reload to the planner view with the provided month/year context
 * and ensures all data is fresh via aggressive cache busting
 */
export function forcePlannerReload(month: number, year: number) {
  // Show a warning in the console first
  console.warn('Initiating forced data refresh with cache clearing...');
  
  // Step 1: Clear the entire cache
  queryClient.clear();
  
  // Step 1.5: Explicitly invalidate critical query keys for extra certainty
  queryClient.invalidateQueries({ queryKey: ['/api/planners'] });
  queryClient.invalidateQueries({ queryKey: ['/api/planners/month', month, 'year', year] });
  queryClient.invalidateQueries({ queryKey: ['/api/planner-slots'] });
  queryClient.invalidateQueries({ queryKey: ['/api/planner-assignments'] });
  queryClient.invalidateQueries({ queryKey: ['plannerAssignments'] });
  
  // Step 2: Generate a unique timestamp for cache busting with microsecond-level precision
  const uniqueTimestamp = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  
  // Step 3: Build the URL with all necessary context and enhanced cache-busting parameters
  // Always use the correct path
  const url = `/events/planner?month=${month}&year=${year}&refresh=${uniqueTimestamp}&force=true&nuclear=true&cb=${uniqueTimestamp.substring(5)}`;
  
  // Step 4: Log the navigation for debugging
  console.log(`🧨 NUCLEAR RELOAD: Forcing complete page reload with: ${url}`);
  
  // Step 5: Perform the actual navigation
  window.location.href = url;
}

/**
 * Forces a complete refresh of the current view with all the current URL parameters preserved
 * and adds additional cache busting parameters
 */
export function forceCurrentViewRefresh() {
  // Show a warning in the console first
  console.warn('Initiating forced data refresh of current view with cache clearing...');
  
  // Step 1: Clear the entire cache
  queryClient.clear();
  
  // Step 1.5: Explicitly invalidate critical query keys for extra certainty
  queryClient.invalidateQueries({ queryKey: ['/api/planners'] });
  queryClient.invalidateQueries({ queryKey: ['/api/planner-slots'] });
  queryClient.invalidateQueries({ queryKey: ['/api/planner-assignments'] });
  queryClient.invalidateQueries({ queryKey: ['plannerAssignments'] });
  queryClient.invalidateQueries({ queryKey: ['/api/monthly-contracts'] });
  
  // Step 2: Get current URL parameters
  const currentParams = new URLSearchParams(window.location.search);
  
  // Step 3: Create a new URLSearchParams object to avoid modifying the original
  const newParams = new URLSearchParams(currentParams);
  
  // Step 4: Add/update cache busting parameters with unique timestamp
  // Use microsecond-level precision by appending random digits
  const uniqueTimestamp = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  newParams.set('refresh', uniqueTimestamp);
  newParams.set('force', 'true');
  newParams.set('nuclear', 'true');
  newParams.set('cb', uniqueTimestamp.substring(5)); // Additional cache buster
  
  // Step 5: Get the correct path mapping in case we're on an old URL structure
  const correctPath = getCorrectPath(window.location.pathname);
  
  // Step 6: Build the new URL with the correct path
  const newUrl = `${correctPath}?${newParams.toString()}`;
  
  // Step 7: Log the navigation for debugging
  console.log(`🧨 NUCLEAR RELOAD: Forcing complete page reload with preserved params: ${newUrl}`);
  
  // Step 8: Perform the actual navigation - note we only redirect if the path has changed
  if (correctPath !== window.location.pathname) {
    console.log(`Path correction: ${window.location.pathname} → ${correctPath}`);
  }
  
  // Always navigate even if the path hasn't changed to ensure fresh data
  window.location.href = newUrl;
}