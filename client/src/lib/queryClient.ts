import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      const jsonResponse = await res.json();
      console.error("API Error:", jsonResponse);
      throw new Error(`${res.status}: ${JSON.stringify(jsonResponse)}`);
    } catch (e) {
      // If it's not JSON, fall back to text
      const text = await res.text() || res.statusText;
      console.error("API Error (text):", text);
      throw new Error(`${res.status}: ${text}`);
    }
  }
}

export async function apiRequest(
  url: string,
  method: string = "GET",
  data?: unknown | undefined,
): Promise<any> {
  console.log(`API Request: ${method} ${url}`, data || '');
  
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    
    // Parse JSON response
    const jsonResponse = await res.json();
    console.log(`API Response: ${method} ${url}`, jsonResponse);
    return jsonResponse;
  } catch (error) {
    console.error(`API Error in ${method} ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
