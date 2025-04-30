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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, Tag, Music, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import type { Category } from "@shared/schema";

interface Instrument {
  id: number;
  name: string;
  categoryIds: number[];
}

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

export default function InstrumentManagerPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("categories");
  const [instruments, setInstruments] = useState<Instrument[]>(standardInstruments);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isAddInstrumentOpen, setIsAddInstrumentOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const { toast } = useToast();
  
  // Fetch categories
  const { data: categories, isLoading: isCategoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Filter based on search query
  const filteredCategories = categories?.filter(category => 
    category.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredInstruments = instruments.filter(instrument => 
    instrument.name.toLowerCase().includes(searchQuery.toLowerCase())
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

  // Mutation for adding a new category
  const addCategoryMutation = useMutation({
    mutationFn: async (values: z.infer<typeof newCategorySchema>) => {
      const { instrumentIds, ...categoryData } = values;
      
      // First, create the category
      const res = await apiRequest("POST", "/api/categories", {
        title: categoryData.title,
        description: categoryData.description || "",
      });
      
      const newCategory = await res.json();
      
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

  // Get the instruments for a specific category
  const getCategoryInstruments = (categoryId: number) => {
    return instruments.filter(instrument => 
      instrument.categoryIds.includes(categoryId)
    );
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
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="instruments">Instruments</TabsTrigger>
        </TabsList>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              {activeTab === "categories" ? "Category Management" : "Instrument Management"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder={`Search ${activeTab === "categories" ? "categories" : "instruments"}...`}
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