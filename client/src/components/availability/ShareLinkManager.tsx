import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, Trash, Link, Calendar, Share2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";

interface ShareLinkProps {
  musicianId: number;
  musicianName: string;
}

interface ShareLink {
  id: number;
  shareLink: string;
  expiryDate: string;
  createdAt: string;
  isExpired: boolean;
}

export function ShareLinkManager({ musicianId, musicianName }: ShareLinkProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expiryDays, setExpiryDays] = useState("30");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch existing share links
  const { data: shareLinks, isLoading } = useQuery<ShareLink[]>({
    queryKey: [`/api/musicians/${musicianId}/availability-share`],
    refetchOnWindowFocus: false,
  });
  
  // Create new share link
  const createLinkMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(
        `/api/musicians/${musicianId}/availability-share`,
        "POST",
        { expiryDays: parseInt(expiryDays) }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/musicians/${musicianId}/availability-share`] });
      setIsDialogOpen(false);
      toast({
        title: "Link created successfully",
        description: "The availability share link has been created and is ready to share",
      });
    },
    onError: (error) => {
      console.error("Error creating share link:", error);
      toast({
        title: "Error creating link",
        description: "There was a problem creating the share link. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Delete share link
  const deleteLinkMutation = useMutation({
    mutationFn: async (linkId: number) => {
      return await apiRequest(
        `/api/musicians/${musicianId}/availability-share/${linkId}`,
        "DELETE", 
        null
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/musicians/${musicianId}/availability-share`] });
      toast({
        title: "Link deleted",
        description: "The availability share link has been deleted successfully",
      });
    },
    onError: (error) => {
      console.error("Error deleting share link:", error);
      toast({
        title: "Error deleting link",
        description: "There was a problem deleting the share link. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link).then(
      () => {
        toast({
          title: "Link copied",
          description: "The availability share link has been copied to your clipboard",
        });
      },
      (err) => {
        console.error("Could not copy link: ", err);
        toast({
          title: "Copy failed",
          description: "Could not copy link to clipboard. Try selecting and copying manually.",
          variant: "destructive",
        });
      }
    );
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Link className="h-5 w-5 mr-2" />
          Availability Share Links
        </CardTitle>
        <CardDescription>
          Create and manage links that can be shared with venues to view {musicianName}'s availability.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : shareLinks && shareLinks.length > 0 ? (
          <div className="space-y-4">
            {shareLinks.map((link) => (
              <div 
                key={link.id} 
                className={`border rounded-md p-4 ${link.isExpired ? 'border-gray-200 bg-gray-50' : 'border-blue-100 bg-blue-50'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 truncate mr-2">
                    <div className="font-medium truncate">{link.shareLink}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Created: {format(new Date(link.createdAt), "MMM d, yyyy")}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {!link.isExpired ? (
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => handleCopyLink(link.shareLink)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    ) : null}
                    
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => deleteLinkMutation.mutate(link.id)}
                      disabled={deleteLinkMutation.isPending}
                    >
                      {deleteLinkMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center mt-2">
                  <Calendar className="h-4 w-4 mr-1.5 text-muted-foreground" />
                  <span className="text-sm">
                    {link.isExpired ? (
                      <span className="text-red-500">Expired: {format(new Date(link.expiryDate), "MMM d, yyyy")}</span>
                    ) : (
                      <span>Expires: {format(new Date(link.expiryDate), "MMM d, yyyy")}</span>
                    )}
                  </span>
                  
                  {link.isExpired ? (
                    <Badge variant="outline" className="ml-2 text-red-500 border-red-200 bg-red-50">
                      Expired
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="ml-2 text-green-500 border-green-200 bg-green-50">
                      Active
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border rounded-md border-dashed">
            <Share2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <h3 className="text-lg font-medium">No share links created</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create a link to share this musician's availability with venues
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          {shareLinks?.length || 0} active share link(s)
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <RefreshCw className="h-4 w-4 mr-2" />
              Create New Link
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Availability Share Link</DialogTitle>
              <DialogDescription>
                Generate a new link for venues to view {musicianName}'s availability
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="expiry">Link Expiry</Label>
                <Select
                  value={expiryDays}
                  onValueChange={setExpiryDays}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select expiry time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Separator />
              
              <div className="text-sm text-muted-foreground">
                <p>This will create a link that venues can use to view this musician's availability without logging in.</p>
                <p className="mt-2">The link will expire after the selected period and can be manually deleted at any time.</p>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => createLinkMutation.mutate()}
                disabled={createLinkMutation.isPending}
              >
                {createLinkMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Link className="h-4 w-4 mr-2" />
                    Create Link
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}