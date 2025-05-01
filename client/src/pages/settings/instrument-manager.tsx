import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, Tag, Music, X, Edit, Trash2, Pencil, Save, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import type { Category, MusicianType as SchemaMusician, InsertMusicianType } from "@shared/schema";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

interface Instrument {
  id: number;
  name: string;
  categoryIds: number[];
}

// Local UI representation of musician type
interface MusicianType {
  id: number;
  name: string;
  description: string;
  defaultRate: number;
  associatedCategoryIds: number[];
}

// Standard musician types
const standardMusicianTypes: MusicianType[] = [
  {
    id: 1,
    name: "Solo Performer",
    description: "Individual musicians who perform alone",
    defaultRate: 150,
    associatedCategoryIds: []
  },
  {
    id: 2,
    name: "Band Member",
    description: "Musicians who perform as part of a band",
    defaultRate: 100,
    associatedCategoryIds: []
  },
  {
    id: 3,
    name: "Orchestra Performer",
    description: "Musicians who perform in orchestras",
    defaultRate: 120,
    associatedCategoryIds: []
  },
  {
    id: 4,
    name: "DJ",
    description: "Disc jockeys who mix and play recorded music",
    defaultRate: 200,
    associatedCategoryIds: []
  }
];

// Standard instruments that can be chosen for categories
const standardInstruments: Instrument[] = [
  // Brass
  { id: 1, name: "Trumpet", categoryIds: [] },
  { id: 2, name: "Trombone", categoryIds: [] },
  { id: 3, name: "French Horn", categoryIds: [] },
  { id: 4, name: "Tuba", categoryIds: [] },
  
  // Woodwinds
  { id: 5, name: "Flute", categoryIds: [] },
  { id: 6, name: "Clarinet", categoryIds: [] },
  { id: 7, name: "Saxophone", categoryIds: [] },
  { id: 8, name: "Oboe", categoryIds: [] },
  { id: 9, name: "Bassoon", categoryIds: [] },
  
  // Strings
  { id: 10, name: "Violin", categoryIds: [] },
  { id: 11, name: "Viola", categoryIds: [] },
  { id: 12, name: "Cello", categoryIds: [] },
  { id: 13, name: "Double Bass", categoryIds: [] },
  { id: 14, name: "Classical Guitar", categoryIds: [] },
  { id: 15, name: "Harp", categoryIds: [] },
  
  // Keyboard
  { id: 16, name: "Piano", categoryIds: [] },
  { id: 17, name: "Organ", categoryIds: [] },
  { id: 18, name: "Harpsichord", categoryIds: [] },
  { id: 19, name: "Synthesizer", categoryIds: [] },
  { id: 20, name: "Electric Keyboard", categoryIds: [] },
  
  // Percussion
  { id: 21, name: "Drums", categoryIds: [] },
  { id: 22, name: "Timpani", categoryIds: [] },
  { id: 23, name: "Xylophone", categoryIds: [] },
  { id: 24, name: "Marimba", categoryIds: [] },
  { id: 25, name: "Congas", categoryIds: [] },
  { id: 26, name: "Bongos", categoryIds: [] },
  
  // Contemporary
  { id: 27, name: "Electric Guitar", categoryIds: [] },
  { id: 28, name: "Bass Guitar", categoryIds: [] },
  { id: 29, name: "Acoustic Guitar", categoryIds: [] },
  { id: 30, name: "DJ Equipment", categoryIds: [] },
  { id: 31, name: "Drum Machine", categoryIds: [] },
  
  // Folk/World
  { id: 32, name: "Banjo", categoryIds: [] },
  { id: 33, name: "Mandolin", categoryIds: [] },
  { id: 34, name: "Accordion", categoryIds: [] },
  { id: 35, name: "Harmonica", categoryIds: [] },
  { id: 36, name: "Sitar", categoryIds: [] },
  { id: 37, name: "Tabla", categoryIds: [] },
  { id: 38, name: "Koto", categoryIds: [] },
  
  // Vocal
  { id: 39, name: "Vocals", categoryIds: [] },
  { id: 40, name: "Choir", categoryIds: [] },
];

// Form schema for adding a new instrument
const newInstrumentSchema = z.object({
  name: z.string().min(2, "Instrument name must be at least 2 characters"),
  categoryIds: z.array(z.number()).optional(),
});

// Form schema for adding a new category
const newCategorySchema = z.object({
  title: z.string().min(2, "Category title must be at least 2 characters"),
  description: z.string().optional(),
  instrumentIds: z.array(z.number()).optional(),
});

// Form schema for musician types
const musicianTypeSchema = z.object({
  name: z.string().min(2, "Type name must be at least 2 characters"),
  description: z.string().min(5, "Please provide a brief description"),
  defaultRate: z.coerce.number().min(1, "Default rate must be at least 1"),
  associatedCategoryIds: z.array(z.number()).optional(),
  isDefault: z.boolean().optional(),
});

export default function InstrumentManagerPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("categories");
  const [instruments, setInstruments] = useState<Instrument[]>(standardInstruments);
  const [musicianTypes, setMusicianTypes] = useState<MusicianType[]>(standardMusicianTypes);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedMusicianType, setSelectedMusicianType] = useState<MusicianType | null>(null);
  const [isAddInstrumentOpen, setIsAddInstrumentOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddMusicianTypeOpen, setIsAddMusicianTypeOpen] = useState(false);
  const [isEditMusicianTypeOpen, setIsEditMusicianTypeOpen] = useState(false);
  const [editingMusicianType, setEditingMusicianType] = useState<MusicianType | null>(null);
  const { toast } = useToast();
  
  // Fetch categories
  const { data: categories, isLoading: isCategoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  
  // Fetch musician types
  const { data: apiMusicianTypes, isLoading: isMusicianTypesLoading } = useQuery<SchemaMusician[]>({
    queryKey: ["/api/musician-types"],
  });
  
  // Convert API musician types to UI format when data loads
  useEffect(() => {
    if (apiMusicianTypes && apiMusicianTypes.length > 0) {
      // Map API data to our UI format
      const mappedTypes: MusicianType[] = apiMusicianTypes.map(type => ({
        id: type.id,
        name: type.name,
        description: type.description,
        defaultRate: type.defaultRate,
        // For now, we don't have category associations in the API response
        // In a real implementation, we would fetch these separately
        associatedCategoryIds: [],
      }));
      
      setMusicianTypes(mappedTypes);
    }
  }, [apiMusicianTypes]);

  // Filter based on search query
  const filteredCategories = categories?.filter(category => 
    category.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredInstruments = instruments.filter(instrument => 
    instrument.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter API musician types 
  const filteredApiMusicianTypes = apiMusicianTypes?.filter(type => 
    type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    type.description.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Fallback to local state if API data is not yet loaded
  const filteredMusicianTypes = filteredApiMusicianTypes || musicianTypes.filter(type => 
    type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    type.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Form for adding a new instrument
  const instrumentForm = useForm<z.infer<typeof newInstrumentSchema>>({
    resolver: zodResolver(newInstrumentSchema),
    defaultValues: {
      name: "",
      categoryIds: [],
    },
  });

  // Form for adding a new category
  const categoryForm = useForm<z.infer<typeof newCategorySchema>>({
    resolver: zodResolver(newCategorySchema),
    defaultValues: {
      title: "",
      description: "",
      instrumentIds: [],
    },
  });

  // Form for adding a new musician type
  const musicianTypeForm = useForm<z.infer<typeof musicianTypeSchema>>({
    resolver: zodResolver(musicianTypeSchema),
    defaultValues: {
      name: "",
      description: "",
      defaultRate: 100,
      associatedCategoryIds: [],
      isDefault: false,
    },
  });

  // Form for editing a musician type
  const editMusicianTypeForm = useForm<z.infer<typeof musicianTypeSchema>>({
    resolver: zodResolver(musicianTypeSchema),
    defaultValues: {
      name: "",
      description: "",
      defaultRate: 100,
      associatedCategoryIds: [],
      isDefault: false,
    },
  });

  // Set up edit form when editing musician type
  useEffect(() => {
    if (editingMusicianType) {
      editMusicianTypeForm.reset({
        name: editingMusicianType.name,
        description: editingMusicianType.description,
        defaultRate: editingMusicianType.defaultRate,
        associatedCategoryIds: editingMusicianType.associatedCategoryIds,
      });
    }
  }, [editingMusicianType, editMusicianTypeForm]);

  // Mutation for adding a new category
  const addCategoryMutation = useMutation({
    mutationFn: async (values: z.infer<typeof newCategorySchema>) => {
      const { instrumentIds, ...categoryData } = values;
      
      // First, create the category
      const newCategory = await apiRequest("/api/categories", "POST", {
        title: categoryData.title,
        description: categoryData.description || "",
      });
      
      // Then, update instrument associations (for a real implementation, this would update 
      // the backend, but here we just update the local state)
      if (instrumentIds && instrumentIds.length > 0) {
        const updatedInstruments = instruments.map(instrument => {
          if (instrumentIds.includes(instrument.id)) {
            return {
              ...instrument,
              categoryIds: [...instrument.categoryIds, newCategory.id]
            };
          }
          return instrument;
        });
        setInstruments(updatedInstruments);
      }
      
      return newCategory;
    },
    onSuccess: () => {
      toast({
        title: "Category created",
        description: "The category has been created successfully with associated instruments",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setIsAddCategoryOpen(false);
      categoryForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create category",
        description: error.message || "An error occurred while creating the category",
        variant: "destructive",
      });
    },
  });

  // Handle adding a new instrument to the local state
  const handleAddInstrument = (values: z.infer<typeof newInstrumentSchema>) => {
    const newId = Math.max(...instruments.map(i => i.id)) + 1;
    const newInstrument: Instrument = {
      id: newId,
      name: values.name,
      categoryIds: values.categoryIds || [],
    };
    
    setInstruments([...instruments, newInstrument]);
    setIsAddInstrumentOpen(false);
    toast({
      title: "Instrument added",
      description: "The instrument has been added to the system",
    });
    instrumentForm.reset();
  };

  // Handle adding a new category with associated instruments
  const handleAddCategory = (values: z.infer<typeof newCategorySchema>) => {
    addCategoryMutation.mutate(values);
  };

  // Mutation for adding a new musician type
  const addMusicianTypeMutation = useMutation({
    mutationFn: async (values: z.infer<typeof musicianTypeSchema>) => {
      const { associatedCategoryIds, ...typeData } = values;
      
      try {
        // Create the musician type
        const response = await apiRequest("POST", "/api/musician-types", {
          name: typeData.name,
          description: typeData.description,
          defaultRate: typeData.defaultRate,
          isDefault: typeData.isDefault || false,
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.message || `Server returned ${response.status}: ${response.statusText}`);
        }
        
        const newType = await response.json();
        
        // Associate with categories if provided
        if (associatedCategoryIds && associatedCategoryIds.length > 0) {
          // This would typically be handled by the backend in the route handler
          // For now, we'll just log that we have categories to associate
          console.log(`Would associate type with categories: ${associatedCategoryIds.join(', ')}`);
        }
        
        return newType;
      } catch (err: any) {
        console.error("Error adding musician type:", err);
        throw new Error(err.message || "Failed to add musician type");
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Musician type added",
        description: `The musician type "${data.name}" has been added successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/musician-types"] });
      setIsAddMusicianTypeOpen(false);
      musicianTypeForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to add musician type",
        description: error.message || "An error occurred while adding the musician type",
        variant: "destructive",
      });
    },
  });
  
  // Mutation for editing a musician type
  const editMusicianTypeMutation = useMutation({
    mutationFn: async ({ typeId, values }: { typeId: number, values: z.infer<typeof musicianTypeSchema> }) => {
      const { associatedCategoryIds, ...typeData } = values;
      
      try {
        // Update the musician type
        const response = await apiRequest("PUT", `/api/musician-types/${typeId}`, {
          name: typeData.name,
          description: typeData.description,
          defaultRate: typeData.defaultRate,
          isDefault: typeData.isDefault,
          categoryIds: associatedCategoryIds || [],
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.message || `Server returned ${response.status}: ${response.statusText}`);
        }
        
        const updatedType = await response.json();
        return updatedType;
      } catch (err: any) {
        console.error("Error updating musician type:", err);
        throw new Error(err.message || "Failed to update musician type");
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Musician type updated",
        description: `The musician type "${data.name}" has been updated successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/musician-types"] });
      setIsEditMusicianTypeOpen(false);
      setEditingMusicianType(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to update musician type",
        description: error.message || "An error occurred while updating the musician type",
        variant: "destructive",
      });
    },
  });
  
  // Mutation for deleting a musician type
  const deleteMusicianTypeMutation = useMutation({
    mutationFn: async (typeId: number) => {
      try {
        const response = await apiRequest("DELETE", `/api/musician-types/${typeId}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.message || `Server returned ${response.status}: ${response.statusText}`);
        }
        
        return typeId;
      } catch (err: any) {
        console.error("Error deleting musician type:", err);
        throw new Error(err.message || "Failed to delete musician type");
      }
    },
    onSuccess: (typeId) => {
      // Find the name of the deleted type to show in the toast
      let typeName = "Musician type";
      if (apiMusicianTypes) {
        const deletedType = apiMusicianTypes.find(t => t.id === typeId);
        if (deletedType) typeName = deletedType.name;
      } else {
        const deletedType = musicianTypes.find(t => t.id === typeId);
        if (deletedType) typeName = deletedType.name;
      }
      
      toast({
        title: "Musician type deleted",
        description: `"${typeName}" has been deleted successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/musician-types"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete musician type",
        description: error.message || "An error occurred while deleting the musician type",
        variant: "destructive",
      });
    },
  });

  // Handle adding a new musician type
  const handleAddMusicianType = (values: z.infer<typeof musicianTypeSchema>) => {
    addMusicianTypeMutation.mutate(values);
  };

  // Handle editing a musician type
  const handleEditMusicianType = (values: z.infer<typeof musicianTypeSchema>) => {
    if (!editingMusicianType) return;
    editMusicianTypeMutation.mutate({ typeId: editingMusicianType.id, values });
  };

  // Handle deleting a musician type
  const handleDeleteMusicianType = (typeId: number) => {
    if (confirm("Are you sure you want to delete this musician type?")) {
      deleteMusicianTypeMutation.mutate(typeId);
    }
  };

  // Get the instruments for a specific category
  const getCategoryInstruments = (categoryId: number) => {
    return instruments.filter(instrument => 
      instrument.categoryIds.includes(categoryId)
    );
  };

  // Fetch categories for a specific musician type from either API or local state
  const getTypeCategories = (typeId: number) => {
    // If using API data
    if (apiMusicianTypes) {
      // First try to find the musician type in the API data
      const apiType = apiMusicianTypes.find(t => t.id === typeId);
      if (apiType) {
        // We'll need to fetch the categories for this type from the API
        // For now, we'd typically use a query hook here, but to simplify
        // we'll use a simplified approach
        
        // Try to map the category IDs (this assumes the API response includes this info)
        // In a real system, we'd do a separate API call to get the categories for this type
        // For now, just return empty since we don't yet have a way to get this data
        return [];
      }
    }
    
    // Fall back to local state if not using API data
    const type = musicianTypes.find(t => t.id === typeId);
    if (!type) return [];
    
    return categories?.filter(category => 
      type.associatedCategoryIds.includes(category.id)
    ) || [];
  };

  // Associate an instrument with a category
  const associateInstrument = (instrumentId: number, categoryId: number) => {
    const updatedInstruments = instruments.map(instrument => {
      if (instrument.id === instrumentId) {
        // Don't add duplicate category
        if (!instrument.categoryIds.includes(categoryId)) {
          return {
            ...instrument,
            categoryIds: [...instrument.categoryIds, categoryId]
          };
        }
      }
      return instrument;
    });
    
    setInstruments(updatedInstruments);
    toast({
      title: "Instrument associated",
      description: "The instrument has been associated with the category",
    });
  };

  // Remove an instrument association from a category
  const removeInstrumentAssociation = (instrumentId: number, categoryId: number) => {
    const updatedInstruments = instruments.map(instrument => {
      if (instrument.id === instrumentId) {
        return {
          ...instrument,
          categoryIds: instrument.categoryIds.filter(id => id !== categoryId)
        };
      }
      return instrument;
    });
    
    setInstruments(updatedInstruments);
    toast({
      title: "Instrument removed",
      description: "The instrument has been removed from the category",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Instrument & Category Manager</h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setIsAddInstrumentOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Instrument
          </Button>
          <Button onClick={() => setIsAddCategoryOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Category
          </Button>
          <Button 
            onClick={() => setIsAddMusicianTypeOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Musician Type
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="instruments">Instruments</TabsTrigger>
          <TabsTrigger value="musician-types">Musician Types</TabsTrigger>
        </TabsList>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              {activeTab === "categories" 
                ? "Category Management" 
                : activeTab === "instruments" 
                  ? "Instrument Management" 
                  : "Musician Type Management"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder={`Search ${
                    activeTab === "categories" 
                      ? "categories" 
                      : activeTab === "instruments" 
                        ? "instruments" 
                        : "musician types"
                  }...`}
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <TabsContent value="categories" className="mt-0">
              {isCategoriesLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredCategories && filteredCategories.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Instruments</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCategories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium">{category.title}</TableCell>
                          <TableCell>{category.description || 'No description'}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {getCategoryInstruments(category.id).map(instrument => (
                                <Badge key={instrument.id} variant="secondary" className="flex items-center gap-1">
                                  {instrument.name}
                                  <button 
                                    onClick={() => removeInstrumentAssociation(instrument.id, category.id)}
                                    className="hover:text-red-500"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-6 px-2"
                                onClick={() => setSelectedCategory(category)}
                              >
                                <Plus className="h-3 w-3 mr-1" /> Add
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="h-80 flex flex-col items-center justify-center text-center">
                  <Tag className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No categories found</h3>
                  <p className="text-gray-500">
                    {searchQuery
                      ? `No categories match "${searchQuery}"`
                      : "Get started by adding your first category"}
                  </p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="instruments" className="mt-0">
              {filteredInstruments.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Categories</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInstruments.map((instrument) => (
                        <TableRow key={instrument.id}>
                          <TableCell className="font-medium">{instrument.name}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {instrument.categoryIds.map(id => {
                                const category = categories?.find(c => c.id === id);
                                return category ? (
                                  <Badge key={id} variant="secondary">
                                    {category.title}
                                  </Badge>
                                ) : null;
                              })}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="h-80 flex flex-col items-center justify-center text-center">
                  <Music className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No instruments found</h3>
                  <p className="text-gray-500">
                    {searchQuery
                      ? `No instruments match "${searchQuery}"`
                      : "Get started by adding your first instrument"}
                  </p>
                </div>
              )}
            </TabsContent>
            
            {/* Musician Types Tab */}
            <TabsContent value="musician-types" className="mt-0">
              {isMusicianTypesLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredMusicianTypes && filteredMusicianTypes.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Default Rate</TableHead>
                        <TableHead>Associated Categories</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMusicianTypes.map((type) => (
                        <TableRow key={type.id}>
                          <TableCell className="font-medium">{type.name}</TableCell>
                          <TableCell>{type.description}</TableCell>
                          <TableCell>${type.defaultRate}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {getTypeCategories(type.id).map(category => (
                                <Badge key={category.id} variant="outline">
                                  {category.title}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-1">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  // We need to map between API type and our local type format
                                  // Check if we're using API data
                                  if (apiMusicianTypes) {
                                    // Using API data format (SchemaMusician) - need to convert to UI format (MusicianType)
                                    const editType: MusicianType = {
                                      id: type.id,
                                      name: type.name,
                                      description: type.description,
                                      defaultRate: type.defaultRate,
                                      // For now, we don't have category associations in the API response
                                      associatedCategoryIds: [],
                                    };
                                    setEditingMusicianType(editType);
                                  } else {
                                    // Using local state format (MusicianType) - can use directly
                                    setEditingMusicianType(type as MusicianType);
                                  }
                                  setIsEditMusicianTypeOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeleteMusicianType(type.id)}
                                disabled={deleteMusicianTypeMutation.isPending && deleteMusicianTypeMutation.variables === type.id}
                              >
                                {deleteMusicianTypeMutation.isPending && deleteMusicianTypeMutation.variables === type.id ? (
                                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-destructive border-t-transparent" />
                                ) : (
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="h-80 flex flex-col items-center justify-center text-center">
                  <User className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No musician types found</h3>
                  <p className="text-gray-500">
                    {searchQuery
                      ? `No musician types match "${searchQuery}"`
                      : "Get started by adding your first musician type"}
                  </p>
                </div>
              )}
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

      {/* Add Instrument Dialog */}
      <Dialog open={isAddInstrumentOpen} onOpenChange={setIsAddInstrumentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Instrument</DialogTitle>
            <DialogDescription>
              Add a new instrument and associate it with categories.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...instrumentForm}>
            <form onSubmit={instrumentForm.handleSubmit(handleAddInstrument)} className="space-y-4">
              <FormField
                control={instrumentForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instrument Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter instrument name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={instrumentForm.control}
                name="categoryIds"
                render={() => (
                  <FormItem>
                    <FormLabel>Categories</FormLabel>
                    <div className="space-y-2">
                      {categories?.map((category) => (
                        <div key={category.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`category-${category.id}`}
                            checked={instrumentForm.watch("categoryIds")?.includes(category.id)}
                            onCheckedChange={(checked) => {
                              const currentValues = instrumentForm.watch("categoryIds") || [];
                              if (checked) {
                                instrumentForm.setValue("categoryIds", [...currentValues, category.id]);
                              } else {
                                instrumentForm.setValue(
                                  "categoryIds",
                                  currentValues.filter((id) => id !== category.id)
                                );
                              }
                            }}
                          />
                          <label
                            htmlFor={`category-${category.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {category.title}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddInstrumentOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Instrument</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>
              Create a new musical category and associate instruments with it.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...categoryForm}>
            <form onSubmit={categoryForm.handleSubmit(handleAddCategory)} className="space-y-4">
              <FormField
                control={categoryForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter category title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={categoryForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter category description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={categoryForm.control}
                name="instrumentIds"
                render={() => (
                  <FormItem>
                    <FormLabel>Instruments</FormLabel>
                    <ScrollArea className="h-48 border rounded-md p-2">
                      <div className="space-y-2">
                        {instruments.map((instrument) => (
                          <div key={instrument.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`instrument-${instrument.id}`}
                              checked={categoryForm.watch("instrumentIds")?.includes(instrument.id)}
                              onCheckedChange={(checked) => {
                                const currentValues = categoryForm.watch("instrumentIds") || [];
                                if (checked) {
                                  categoryForm.setValue("instrumentIds", [...currentValues, instrument.id]);
                                } else {
                                  categoryForm.setValue(
                                    "instrumentIds",
                                    currentValues.filter((id) => id !== instrument.id)
                                  );
                                }
                              }}
                            />
                            <label
                              htmlFor={`instrument-${instrument.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {instrument.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddCategoryOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={addCategoryMutation.isPending}
                >
                  {addCategoryMutation.isPending ? "Adding..." : "Add Category"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Musician Type Dialog */}
      <Dialog open={isAddMusicianTypeOpen} onOpenChange={setIsAddMusicianTypeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Musician Type</DialogTitle>
            <DialogDescription>
              Create a new musician type with associated categories and default rate
            </DialogDescription>
          </DialogHeader>
          
          <Form {...musicianTypeForm}>
            <form onSubmit={musicianTypeForm.handleSubmit(handleAddMusicianType)} className="space-y-4">
              <FormField
                control={musicianTypeForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type Name</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., Solo Performer, Band Member" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={musicianTypeForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe this type of musician" 
                        className="h-24" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={musicianTypeForm.control}
                name="defaultRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Rate (USD)</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormDescription>
                      Suggested default hourly rate for this type of musician
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={musicianTypeForm.control}
                name="associatedCategoryIds"
                render={() => (
                  <FormItem>
                    <FormLabel>Associated Music Categories</FormLabel>
                    <div className="h-40 overflow-y-auto border rounded-md p-2">
                      <div className="space-y-2">
                        {categories?.map((category) => (
                          <div key={category.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`type-category-${category.id}`}
                              checked={musicianTypeForm.watch("associatedCategoryIds")?.includes(category.id)}
                              onCheckedChange={(checked) => {
                                const currentValues = musicianTypeForm.watch("associatedCategoryIds") || [];
                                if (checked) {
                                  musicianTypeForm.setValue("associatedCategoryIds", [...currentValues, category.id]);
                                } else {
                                  musicianTypeForm.setValue(
                                    "associatedCategoryIds",
                                    currentValues.filter((id) => id !== category.id)
                                  );
                                }
                              }}
                            />
                            <label
                              htmlFor={`type-category-${category.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {category.title}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={musicianTypeForm.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Make Default</FormLabel>
                      <FormDescription>
                        Set as a default musician type for new musician profiles
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddMusicianTypeOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={addMusicianTypeMutation.isPending}
                >
                  {addMusicianTypeMutation.isPending ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Adding...
                    </>
                  ) : (
                    "Add Musician Type"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Musician Type Dialog */}
      <Dialog open={isEditMusicianTypeOpen} onOpenChange={setIsEditMusicianTypeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Musician Type</DialogTitle>
            <DialogDescription>
              Update the musician type details
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editMusicianTypeForm}>
            <form onSubmit={editMusicianTypeForm.handleSubmit(handleEditMusicianType)} className="space-y-4">
              <FormField
                control={editMusicianTypeForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type Name</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., Solo Performer, Band Member" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editMusicianTypeForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe this type of musician" 
                        className="h-24" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editMusicianTypeForm.control}
                name="defaultRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Rate (USD)</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormDescription>
                      Suggested default hourly rate for this type of musician
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editMusicianTypeForm.control}
                name="associatedCategoryIds"
                render={() => (
                  <FormItem>
                    <FormLabel>Associated Music Categories</FormLabel>
                    <div className="h-40 overflow-y-auto border rounded-md p-2">
                      <div className="space-y-2">
                        {categories?.map((category) => (
                          <div key={category.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`edit-type-category-${category.id}`}
                              checked={editMusicianTypeForm.watch("associatedCategoryIds")?.includes(category.id)}
                              onCheckedChange={(checked) => {
                                const currentValues = editMusicianTypeForm.watch("associatedCategoryIds") || [];
                                if (checked) {
                                  editMusicianTypeForm.setValue("associatedCategoryIds", [...currentValues, category.id]);
                                } else {
                                  editMusicianTypeForm.setValue(
                                    "associatedCategoryIds",
                                    currentValues.filter((id) => id !== category.id)
                                  );
                                }
                              }}
                            />
                            <label
                              htmlFor={`edit-type-category-${category.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {category.title}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsEditMusicianTypeOpen(false);
                    setEditingMusicianType(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={editMusicianTypeMutation.isPending}
                >
                  {editMusicianTypeMutation.isPending ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Select Instrument for Category Dialog */}
      <Dialog open={!!selectedCategory} onOpenChange={(open) => !open && setSelectedCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Instruments to {selectedCategory?.title}</DialogTitle>
            <DialogDescription>
              Select instruments to associate with this category.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-64 border rounded-md p-2">
            <div className="space-y-2">
              {instruments
                .filter(instrument => !instrument.categoryIds.includes(selectedCategory?.id || 0))
                .map((instrument) => (
                  <div key={instrument.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <span>{instrument.name}</span>
                    <Button 
                      size="sm" 
                      onClick={() => {
                        if (selectedCategory) {
                          associateInstrument(instrument.id, selectedCategory.id);
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                ))}
            </div>
          </ScrollArea>
          
          <DialogFooter>
            <Button onClick={() => setSelectedCategory(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}