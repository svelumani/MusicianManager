import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ContractContentPreviewProps {
  contractId?: number;
  token?: string;
}

/**
 * A component that renders contract content, either by ID (admin view) or by token (musician view)
 * This ensures consistent rendering between both views
 */
export default function ContractContentPreview({ contractId, token }: ContractContentPreviewProps) {
  const [hasError, setHasError] = useState(false);
  
  // Query for content based on either contract ID or token
  const { data: contractContent, isLoading, error } = useQuery({
    queryKey: contractId 
      ? [`/api/contracts/${contractId}/content`] 
      : [`/api/v2/contracts/token/${token}/content`], // Use direct endpoint for tokens
    queryFn: async () => {
      try {
        console.log(`Fetching contract content for ${contractId ? 'ID: ' + contractId : 'token: ' + token}`);
        const timestamp = Date.now(); // Add cache-busting parameter
        
        // Use direct endpoint for tokens, regular API for contract IDs
        const endpoint = contractId 
          ? `/api/contracts/${contractId}/content?t=${timestamp}` 
          : `/api/v2/contracts/token/${token}/content?t=${timestamp}`;
        
        console.log(`Using endpoint: ${endpoint}`);
        const response = await fetch(endpoint);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to fetch contract content: ${response.status}`, errorText);
          setHasError(true);
          throw new Error(`Failed to fetch contract content: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Contract content loaded successfully:', data);
        return data;
      } catch (error) {
        console.error('Error fetching contract content:', error);
        setHasError(true);
        throw error;
      }
    },
    enabled: !!(contractId || token), // Only run if either contractId or token is provided
    // Force refetch data to ensure we get the latest stored content
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: 2
  });
  
  // Set error state when there's an error
  useEffect(() => {
    if (error) {
      console.error('Contract content query error:', error);
      setHasError(true);
    }
  }, [error]);
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  if (hasError || !contractContent?.content) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">
          {hasError 
            ? "Error loading contract. Please try again later." 
            : "Contract template not found."}
        </p>
      </div>
    );
  }
  
  return (
    <ScrollArea className="border rounded-md h-[500px] p-4">
      <div className="p-6 bg-white prose prose-sm max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {contractContent.content}
        </ReactMarkdown>
      </div>
    </ScrollArea>
  );
}