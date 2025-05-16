/**
 * API configuration for different environments
 */

// Determine if we're running in Docker (environment variable can be set in docker-compose)
const isDocker = process.env.IS_DOCKER === 'true';

// API base URL configuration
export const API_BASE_URL = isDocker 
  ? 'http://app:5000' // Docker internal service name
  : ''; // Empty string means use relative URLs (same origin)

// Helper function to build API URLs
export function getApiUrl(path: string): string {
  // Make sure path starts with /api
  if (!path.startsWith('/api')) {
    path = `/api${path.startsWith('/') ? path : `/${path}`}`;
  }
  
  return `${API_BASE_URL}${path}`;
}