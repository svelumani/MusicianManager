import { useState } from "react";
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
  const { data: contractContent, isLoading } = useQuery({
    queryKey: contractId 
      ? [`/api/contracts/${contractId}/content`] 
      : [`/api/contracts/token/${token}/content`],
    onError: () => setHasError(true),
    enabled: !!(contractId || token), // Only run if either contractId or token is provided
    // Force refetch data to ensure we get the latest stored content
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });
  
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