/**
 * AutoRefreshManager
 * 
 * This component manages the automatic data refresh functionality
 * by starting and stopping the refresh polling system based on
 * the current route.
 */
import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { startAutoRefresh, stopAutoRefresh } from '@/lib/utils/autoRefresh';

// Routes that should enable auto-refresh
const AUTO_REFRESH_ROUTES = [
  // Planner routes
  '/events/planner',
  // Event routes
  '/events',
  // Musician routes
  '/musicians',
  // Contract routes
  '/contracts',
  '/monthly/contracts',
  '/monthly/status',
];

export default function AutoRefreshManager() {
  const [location] = useLocation();
  
  useEffect(() => {
    // Check if the current route should have auto-refresh enabled
    const shouldEnableAutoRefresh = AUTO_REFRESH_ROUTES.some(route => 
      location.startsWith(route)
    );
    
    // Check if this is a critical view that needs more aggressive refresh
    const isCriticalView = location.includes('/planner') || 
                          location.includes('/monthly/contracts') || 
                          location.includes('/monthly/contract-detail');
    
    if (shouldEnableAutoRefresh) {
      console.log(`🔄 Auto-refresh enabled for route: ${location}`);
      
      // Stop any existing refresh interval first to avoid duplicates
      stopAutoRefresh();
      
      // If this is a critical view, force an immediate refresh when we enter the page
      if (isCriticalView) {
        console.log('⚠️ Critical data view detected - forcing immediate data check');
        // Import here to avoid circular dependencies
        import('@/lib/utils/autoRefresh').then(({ triggerVersionCheck }) => {
          // Small delay to ensure the view is fully loaded first
          setTimeout(() => {
            triggerVersionCheck();
          }, 1000);
        });
      }
      
      // Start the auto-refresh system
      startAutoRefresh();
    } else {
      console.log(`🛑 Auto-refresh disabled for route: ${location}`);
      stopAutoRefresh();
    }
    
    // Cleanup on unmount
    return () => {
      stopAutoRefresh();
    };
  }, [location]);
  
  // This is a utility component that doesn't render anything
  return null;
}