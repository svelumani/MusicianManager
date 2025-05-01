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
  console.log(`API Request: ${url} ${method}`, data || '');
  
  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    
    // For DELETE requests that may not return content
    if (method === "DELETE" && res.status === 204) {
      return { success: true };
    }
    
    // Parse JSON response
    try {
      const jsonResponse = await res.json();
      console.log(`API Response: ${method} ${url}`, jsonResponse);
      return jsonResponse;
    } catch (e) {
      // If no content or invalid JSON, return success status
      return { success: true, status: res.status };
    }
  } catch (error) {
    console.error(`API Error in ${url} ${method}:`, error);
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
      headers: {
        "Accept": "application/json"
      }
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    try {
      return await res.json();
    } catch (e) {
      console.warn("No JSON content returned for", queryKey[0]);
      return null;
    }
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
