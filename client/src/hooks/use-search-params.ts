import { useLocation } from "wouter";

export function useSearchParams() {
  const [location] = useLocation();
  
  if (typeof window === 'undefined') {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.search);
}