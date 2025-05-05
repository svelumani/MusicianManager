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
    
    if (shouldEnableAutoRefresh) {
      console.log(`🔄 Auto-refresh enabled for route: ${location}`);
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