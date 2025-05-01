import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, ThumbsUp, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SkillTag, MusicianSkillTag } from "@shared/schema";

interface SkillTagListProps {
  musicianId: number;
  readOnly?: boolean;
}

export default function SkillTagList({ musicianId, readOnly = false }: SkillTagListProps) {
  const queryClient = useQueryClient();
  const [newTagName, setNewTagName] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  
  // Get all available skill tags
  const { data: allTags, isLoading: tagsLoading } = useQuery({
    queryKey: ["/api/skill-tags"],
    queryFn: async () => {
      const res = await fetch("/api/skill-tags");
      if (!res.ok) throw new Error("Failed to fetch skill tags");
      return res.json();
    },
  });
  
  // Get musician's skill tags
  const { data: musicianTags, isLoading: musicianTagsLoading } = useQuery({
    queryKey: ["/api/musicians", musicianId, "skill-tags"],
    queryFn: async () => {
      const res = await fetch(`/api/musicians/${musicianId}/skill-tags`);
      if (!res.ok) throw new Error("Failed to fetch musician skill tags");
      return res.json();
    },
  });
  
  // Add tag to musician
  const addTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      const res = await apiRequest("POST", `/api/musicians/${musicianId}/skill-tags`, {
        skillTagId: tagId,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/musicians", musicianId, "skill-tags"] });
      toast({
        title: "Tag added",
        description: "The skill tag has been added to the musician.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Remove tag from musician
  const removeTagMutation = useMutation({
    mutationFn: async (musicianTagId: number) => {
      const res = await apiRequest("DELETE", `/api/musicians/${musicianId}/skill-tags/${musicianTagId}`);
      return res.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/musicians", musicianId, "skill-tags"] });
      toast({
        title: "Tag removed",
        description: "The skill tag has been removed from the musician.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Endorse a skill
  const endorseMutation = useMutation({
    mutationFn: async (skillTagId: number) => {
      const res = await apiRequest("POST", `/api/musicians/${musicianId}/skill-tags/${skillTagId}/endorse`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/musicians", musicianId, "skill-tags"] });
      toast({
        title: "Skill endorsed",
        description: "You have endorsed this musician's skill.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to endorse skill",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Create a new tag
  const createTagMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/skill-tags", { name });
      return await res.json();
    },
    onSuccess: (newTag) => {
      queryClient.invalidateQueries({ queryKey: ["/api/skill-tags"] });
      toast({
        title: "Tag created",
        description: "The new skill tag has been created.",
      });
      setNewTagName("");
      // Add the new tag to the musician
      addTagMutation.mutate(newTag.id);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleCreateTag = () => {
    if (!newTagName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for the skill tag.",
        variant: "destructive",
      });
      return;
    }
    
    createTagMutation.mutate(newTagName.trim());
    setIsAddingTag(false);
  };
  
  if (tagsLoading || musicianTagsLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  
  // Get tags that are not already assigned to musician
  const availableTags = allTags?.filter(
    (tag: SkillTag) => !musicianTags?.some((mt: MusicianSkillTag) => mt.skillTagId === tag.id)
  );
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Skills & Expertise</h3>
        {!readOnly && (
          <Dialog open={isAddingTag} onOpenChange={setIsAddingTag}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Skill
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a Skill Tag</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  {availableTags?.length > 0 ? (
                    <>
                      <p className="text-sm text-muted-foreground">Select an existing skill tag:</p>
                      <div className="flex flex-wrap gap-2">
                        {availableTags.map((tag: SkillTag) => (
                          <Badge
                            key={tag.id}
                            variant="outline"
                            className="cursor-pointer hover:bg-secondary"
                            onClick={() => {
                              addTagMutation.mutate(tag.id);
                              setIsAddingTag(false);
                            }}
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No more skill tags available to add.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Or create a new skill tag:</p>
                  <div className="flex gap-2">
                    <Input
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="Enter new skill tag name"
                    />
                    <Button onClick={handleCreateTag} disabled={createTagMutation.isPending}>
                      {createTagMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Plus className="h-4 w-4 mr-1" />
                      )}
                      Create
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {musicianTags?.length > 0 ? (
          musicianTags.map((tag: MusicianSkillTag) => (
            <Badge key={tag.id} variant="secondary" className="flex items-center gap-1">
              {tag.skillTag.name}
              {tag.endorsementCount > 0 && (
                <span className="ml-1 bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-xs">
                  {tag.endorsementCount}
                </span>
              )}
              {!readOnly && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 p-0">
                      <span className="sr-only">Actions</span>
                      <i className="text-xs">⋯</i>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => endorseMutation.mutate(tag.skillTagId)}
                      disabled={endorseMutation.isPending}
                    >
                      <ThumbsUp className="h-4 w-4 mr-2" />
                      Endorse
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => removeTagMutation.mutate(tag.id)}
                      disabled={removeTagMutation.isPending}
                      className="text-destructive"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </Badge>
          ))
        ) : (
          <p className="text-sm text-muted-foreground italic">No skills added yet.</p>
        )}
      </div>
    </div>
  );
}