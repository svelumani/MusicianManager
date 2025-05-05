/**
 * Force Refresh Utilities
 * 
 * This module provides functions to ensure we always have fresh data
 * by forcing complete page reloads with appropriate context preservation.
 */
import { queryClient } from "@/lib/queryClient";

/**
 * Forces a complete page reload to the planner view with the provided month/year context
 * and ensures all data is fresh via aggressive cache busting
 */
export function forcePlannerReload(month: number, year: number) {
  // Step 1: Clear the entire cache
  queryClient.clear();
  
  // Step 2: Generate a timestamp for cache busting
  const timestamp = Date.now();
  
  // Step 3: Build the URL with all necessary context and forced refresh parameters
  const url = `/events/planner?month=${month}&year=${year}&refresh=${timestamp}&force=true&nuclear=true`;
  
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
  // Step 1: Clear the entire cache
  queryClient.clear();
  
  // Step 2: Get current URL parameters
  const currentParams = new URLSearchParams(window.location.search);
  
  // Step 3: Create a new URLSearchParams object to avoid modifying the original
  const newParams = new URLSearchParams(currentParams);
  
  // Step 4: Add/update cache busting parameters
  newParams.set('refresh', Date.now().toString());
  newParams.set('force', 'true');
  newParams.set('nuclear', 'true');
  
  // Step 5: Build the new URL
  const newUrl = `${window.location.pathname}?${newParams.toString()}`;
  
  // Step 6: Log the navigation for debugging
  console.log(`🧨 NUCLEAR RELOAD: Forcing complete page reload with preserved params: ${newUrl}`);
  
  // Step 7: Perform the actual navigation
  window.location.href = newUrl;
}