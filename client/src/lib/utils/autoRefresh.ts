/**
 * Auto Refresh System
 * 
 * This module provides automatic data refresh functionality to ensure
 * data is always up-to-date without requiring manual refresh by users.
 * 
 * It works by:
 * 1. Checking data versions from the server
 * 2. Comparing with locally cached versions
 * 3. Triggering refresh when newer versions are detected
 */
import { queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { forceCurrentViewRefresh, getCorrectPath } from "./forceRefresh";

// Local cache of data versions (to compare against server versions)
let localVersions: Record<string, number> = {};

// Define version keys matching server keys for different data types
export const VERSION_KEYS = {
  PLANNER: "planner_data",
  PLANNER_ASSIGNMENTS: "planner_assignments", 
  PLANNER_SLOTS: "planner_slots",
  MUSICIANS: "musicians",
  VENUES: "venues",
  CATEGORIES: "event_categories",
  EVENTS: "events",
  MONTHLY_CONTRACTS: "monthly_contracts",
  MONTHLY: "monthly_data",
  MONTHLY_INVOICES: "monthly_invoices",
  MONTHLY_PLANNERS: "monthly_planners",
};

// Map of version keys to query keys (for selective invalidation)
const VERSION_TO_QUERY_MAP: Record<string, string[]> = {
  [VERSION_KEYS.PLANNER]: ['/api/planners'],
  [VERSION_KEYS.PLANNER_ASSIGNMENTS]: ['/api/planner-assignments'],
  [VERSION_KEYS.PLANNER_SLOTS]: ['/api/planner-slots'],
  [VERSION_KEYS.MUSICIANS]: ['/api/musicians'],
  [VERSION_KEYS.VENUES]: ['/api/venues'],
  [VERSION_KEYS.CATEGORIES]: ['/api/categories'],
  [VERSION_KEYS.EVENTS]: ['/api/events'],
  [VERSION_KEYS.MONTHLY_CONTRACTS]: ['/api/monthly-contracts'],
  [VERSION_KEYS.MONTHLY]: ['/api/monthly-contracts', '/api/monthly-invoices'],
  [VERSION_KEYS.MONTHLY_INVOICES]: ['/api/monthly-invoices'],
  [VERSION_KEYS.MONTHLY_PLANNERS]: ['/api/planners'],
};

/**
 * Refreshes data for specific version keys by invalidating their related queries
 */
async function refreshDataForVersions(changedVersionKeys: string[]) {
  if (changedVersionKeys.length === 0) return;
  
  // Create an array of query keys to invalidate
  const queryKeysToInvalidate: string[] = [];
  
  // Add all affected query keys to the array
  changedVersionKeys.forEach(versionKey => {
    const queryKeys = VERSION_TO_QUERY_MAP[versionKey] || [];
    queryKeys.forEach(key => {
      // Only add if not already in the array
      if (!queryKeysToInvalidate.includes(key)) {
        queryKeysToInvalidate.push(key);
      }
    });
  });
  
  // Invalidate all affected query keys
  for (const queryKey of queryKeysToInvalidate) {
    await queryClient.invalidateQueries({ queryKey: [queryKey] });
    console.log(`Invalidated queries for key: ${queryKey}`);
  }
  
  // Show toast notification
  toast({
    title: "Data Updated",
    description: "New data is available and has been loaded automatically.",
    duration: 3000,
  });
}

/**
 * Checks for version updates by comparing server versions to local versions
 */
export async function checkVersionUpdates() {
  try {
    // Fetch latest versions from server
    const response = await fetch('/api/versions');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch versions: ${response.status}`);
    }
    
    const serverVersions: Record<string, number> = await response.json();
    
    // Check if this is the first time fetching versions
    const isFirstFetch = Object.keys(localVersions).length === 0;
    
    // Find changed version keys
    const changedVersionKeys: string[] = [];
    
    // Compare server versions with local versions
    Object.entries(serverVersions).forEach(([key, version]) => {
      if (localVersions[key] === undefined || localVersions[key] < version) {
        changedVersionKeys.push(key);
        // Update local version
        localVersions[key] = version;
      }
    });
    
    // Skip auto-refresh on first fetch to avoid unnecessary refreshes on initial load
    if (!isFirstFetch && changedVersionKeys.length > 0) {
      console.log(`Auto-refresh triggered for updated data:`, changedVersionKeys);
      
      // Check for critical updates requiring full page refresh
      const criticalUpdates = [
        VERSION_KEYS.PLANNER,
        VERSION_KEYS.PLANNER_ASSIGNMENTS,
        VERSION_KEYS.PLANNER_SLOTS,
        VERSION_KEYS.MONTHLY,
        VERSION_KEYS.MONTHLY_CONTRACTS,
        VERSION_KEYS.MONTHLY_INVOICES,
        VERSION_KEYS.MONTHLY_PLANNERS
      ];
      
      const hasCriticalUpdate = changedVersionKeys.some(key => 
        criticalUpdates.includes(key)
      );
      
      // For critical updates, force full page refresh
      if (hasCriticalUpdate && (
        window.location.pathname.includes('/events/planner') || 
        window.location.pathname.includes('/monthly/contracts') || 
        window.location.pathname.includes('/monthly/contract-detail')
      )) {
        console.log(`⚠️ Critical data update detected. Performing full refresh...`);
        forceCurrentViewRefresh();
        return;
      }
      
      // For non-critical updates, just invalidate queries
      await refreshDataForVersions(changedVersionKeys);
    }
  } catch (error) {
    console.error("Error checking version updates:", error);
  }
}

// Poll interval (every 30 seconds)
const POLL_INTERVAL = 30000;

let pollInterval: number | null = null;

/**
 * Starts the auto-refresh polling system
 */
export function startAutoRefresh() {
  // Clear any existing interval
  if (pollInterval !== null) {
    clearInterval(pollInterval);
  }
  
  // Initialize with current versions
  checkVersionUpdates();
  
  // Set up polling interval
  pollInterval = window.setInterval(() => {
    checkVersionUpdates();
  }, POLL_INTERVAL);
  
  console.log(`🔄 Auto-refresh polling started (interval: ${POLL_INTERVAL}ms)`);
}

/**
 * Stops the auto-refresh polling system
 */
export function stopAutoRefresh() {
  if (pollInterval !== null) {
    clearInterval(pollInterval);
    pollInterval = null;
    console.log(`🛑 Auto-refresh polling stopped`);
  }
}

/**
 * Manually triggers an immediate version check
 */
export function triggerVersionCheck() {
  console.log(`🔍 Manual version check triggered`);
  return checkVersionUpdates();
}