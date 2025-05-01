import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Tag, Trash2, Music, Building, Calendar, Mic } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import type { MusicianCategory, VenueCategory, EventCategory, MusicianType } from "@shared/schema";

type CategoryType = "musician" | "venue" | "event" | "musician-type";

export default function CategoriesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [categoryType, setCategoryType] = useState<CategoryType>("musician");
  const { toast } = useToast();
  
  const { data: musicianCategories, isLoading: isLoadingMusician } = useQuery<MusicianCategory[]>({
    queryKey: ["/api/musician-categories"],
  });

  const { data: venueCategories, isLoading: isLoadingVenue } = useQuery<VenueCategory[]>({
    queryKey: ["/api/venue-categories"],
  });

  const { data: eventCategories, isLoading: isLoadingEvent } = useQuery<EventCategory[]>({
    queryKey: ["/api/event-categories"],
  });
  
  const { data: musicianTypes, isLoading: isLoadingMusicianType } = useQuery<MusicianType[]>({
    queryKey: ["/api/musician-types"],
  });

  // Active categories based on selected tab
  const activeCategories = 
    categoryType === "musician" ? musicianCategories :
    categoryType === "venue" ? venueCategories :
    categoryType === "event" ? eventCategories :
    musicianTypes;
  
  const isLoading = 
    categoryType === "musician" ? isLoadingMusician :
    categoryType === "venue" ? isLoadingVenue :
    categoryType === "event" ? isLoadingEvent :
    isLoadingMusicianType;

  const filteredCategories = activeCategories?.filter(category => 
    (category?.title?.toLowerCase()?.includes(searchQuery.toLowerCase()) || false) ||
    (category?.description?.toLowerCase()?.includes(searchQuery.toLowerCase()) || false)
  );

  const getApiPath = (id?: number) => {
    const basePath = 
      categoryType === "musician" ? "/api/musician-categories" :
      categoryType === "venue" ? "/api/venue-categories" :
      categoryType === "event" ? "/api/event-categories" :
      "/api/musician-types";
    
    return id ? `${basePath}/${id}` : basePath;
  };

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(getApiPath(id), "DELETE");
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Category deleted",
        description: "The category has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: [getApiPath()] });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete category",
        description: error.message || "An error occurred while deleting the category",
        variant: "destructive",
      });
    },
  });

  const handleDeleteCategory = (id: number) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteCategoryMutation.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const getAddLink = () => {
    return `/categories/add?type=${categoryType}`;
  };

  const getCategoryTypeIcon = () => {
    switch (categoryType) {
      case "musician": return <Music className="h-12 w-12 text-gray-400 mb-4" />;
      case "venue": return <Building className="h-12 w-12 text-gray-400 mb-4" />;
      case "event": return <Calendar className="h-12 w-12 text-gray-400 mb-4" />;
      case "musician-type": return <Mic className="h-12 w-12 text-gray-400 mb-4" />;
      default: return <Tag className="h-12 w-12 text-gray-400 mb-4" />;
    }
  };

  const getCategoryTypeName = () => {
    switch (categoryType) {
      case "musician": return "Musician";
      case "venue": return "Venue";
      case "event": return "Event";
      case "musician-type": return "Musician Type";
      default: return "Category";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories</h1>
        <Link href={getAddLink()}>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add {getCategoryTypeName()} Category
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Category Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="musician" className="w-full" onValueChange={(value) => setCategoryType(value as CategoryType)}>
            <TabsList className="mb-4 grid grid-cols-4 w-full">
              <TabsTrigger value="musician">
                <Music className="h-4 w-4 mr-2" /> Musician Categories
              </TabsTrigger>
              <TabsTrigger value="venue">
                <Building className="h-4 w-4 mr-2" /> Venue Categories
              </TabsTrigger>
              <TabsTrigger value="event">
                <Calendar className="h-4 w-4 mr-2" /> Event Categories
              </TabsTrigger>
              <TabsTrigger value="musician-type">
                <Mic className="h-4 w-4 mr-2" /> Musician Types
              </TabsTrigger>
            </TabsList>
            
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder={`Search ${getCategoryTypeName().toLowerCase()} categories...`}
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <TabsContent value="musician" className="mt-0">
              {renderCategoryContent()}
            </TabsContent>
            <TabsContent value="venue" className="mt-0">
              {renderCategoryContent()}
            </TabsContent>
            <TabsContent value="event" className="mt-0">
              {renderCategoryContent()}
            </TabsContent>
            <TabsContent value="musician-type" className="mt-0">
              {renderCategoryContent()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the {getCategoryTypeName().toLowerCase()} category.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              {deleteCategoryMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  function renderCategoryContent() {
    if (isLoading) {
      return (
        <div className="h-80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (filteredCategories && filteredCategories.length > 0) {
      return (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.title}</TableCell>
                  <TableCell>{category.description || 'No description'}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeleteCategory(category.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }

    return (
      <div className="h-80 flex flex-col items-center justify-center text-center">
        {getCategoryTypeIcon()}
        <h3 className="text-lg font-medium text-gray-900">No {getCategoryTypeName().toLowerCase()} categories found</h3>
        <p className="text-gray-500">
          {searchQuery
            ? `No categories match "${searchQuery}"`
            : `Get started by adding your first ${getCategoryTypeName().toLowerCase()} category`}
        </p>
      </div>
    );
  }
}
