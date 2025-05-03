import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Music, Search, Plus, Star, ArrowUpDown } from "lucide-react";
import type { Musician, Category, MusicianType } from "@shared/schema";

type SortField = 'name' | 'type' | 'category' | 'email' | 'rating';

export default function MusiciansPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const { data: musicians, isLoading: isLoadingMusicians } = useQuery<Musician[]>({
    queryKey: ["/api/musicians"],
  });
  
  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  
  const { data: musicianTypes } = useQuery<MusicianType[]>({
    queryKey: ["/api/musician-types"],
  });

  const getCategoryName = (categoryId: number) => {
    const category = categories?.find(c => c.id === categoryId);
    return category ? category.title : "Unknown";
  };
  
  const getMusicianTypeName = (typeId: number) => {
    const type = musicianTypes?.find(t => t.id === typeId);
    return type ? type.title : "Unknown";
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return <ArrowUpDown className={`ml-1 h-4 w-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} />;
  };

  // First filter musicians based on search query
  const filteredMusicians = musicians?.filter(musician => 
    musician.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getMusicianTypeName(musician.typeId).toLowerCase().includes(searchQuery.toLowerCase()) ||
    getCategoryName(musician.categoryId).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Then sort the filtered musicians
  const sortedMusicians = filteredMusicians ? [...filteredMusicians].sort((a, b) => {
    if (sortField === 'name') {
      return sortDirection === 'asc' 
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    } 
    else if (sortField === 'type') {
      const typeA = getMusicianTypeName(a.typeId);
      const typeB = getMusicianTypeName(b.typeId);
      return sortDirection === 'asc'
        ? typeA.localeCompare(typeB)
        : typeB.localeCompare(typeA);
    }
    else if (sortField === 'category') {
      const categoryA = getCategoryName(a.categoryId);
      const categoryB = getCategoryName(b.categoryId);
      return sortDirection === 'asc'
        ? categoryA.localeCompare(categoryB)
        : categoryB.localeCompare(categoryA);
    }
    else if (sortField === 'email') {
      return sortDirection === 'asc'
        ? a.email.localeCompare(b.email)
        : b.email.localeCompare(a.email);
    }
    else if (sortField === 'rating') {
      // Handle null ratings - sort them last
      if (a.rating === null && b.rating === null) return 0;
      if (a.rating === null) return sortDirection === 'asc' ? 1 : -1;
      if (b.rating === null) return sortDirection === 'asc' ? -1 : 1;
      
      return sortDirection === 'asc'
        ? a.rating - b.rating
        : b.rating - a.rating;
    }
    return 0;
  }) : [];

  const handleViewMusician = (id: number) => {
    navigate(`/musicians/${id}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Musicians</h1>
        <Link href="/musicians/add">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add Musician
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Musician Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search musicians by name, type or category..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {isLoadingMusicians ? (
            <div className="h-80 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredMusicians && filteredMusicians.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      onClick={() => handleSort('name')}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <div className="flex items-center">
                        Name {getSortIcon('name')}
                      </div>
                    </TableHead>
                    <TableHead 
                      onClick={() => handleSort('type')}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <div className="flex items-center">
                        Type {getSortIcon('type')}
                      </div>
                    </TableHead>
                    <TableHead 
                      onClick={() => handleSort('category')}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <div className="flex items-center">
                        Category {getSortIcon('category')}
                      </div>
                    </TableHead>
                    <TableHead 
                      onClick={() => handleSort('email')}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <div className="flex items-center">
                        Contact {getSortIcon('email')}
                      </div>
                    </TableHead>
                    <TableHead>Pay Rate</TableHead>
                    <TableHead 
                      onClick={() => handleSort('rating')}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <div className="flex items-center">
                        Rating {getSortIcon('rating')}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedMusicians.map((musician) => (
                    <TableRow key={musician.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <Avatar className="h-9 w-9 mr-2">
                            {musician.profileImage ? (
                              <AvatarImage src={musician.profileImage} alt={musician.name} />
                            ) : (
                              <AvatarFallback>{musician.name.charAt(0).toUpperCase()}</AvatarFallback>
                            )}
                          </Avatar>
                          <span className="font-medium">{musician.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getMusicianTypeName(musician.typeId)}</TableCell>
                      <TableCell>{getCategoryName(musician.categoryId)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{musician.email}</div>
                          <div className="text-gray-500">{musician.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>Multiple rates</TableCell>
                      <TableCell>
                        {musician.rating ? (
                          <div className="flex items-center">
                            <Star className="h-4 w-4 text-yellow-500 mr-1" />
                            {musician.rating.toFixed(1)}
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleViewMusician(musician.id)}>
                            View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => navigate(`/musicians/${musician.id}/performance`)}
                          >
                            <Star className="h-4 w-4 mr-1" /> Rate
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
              <Music className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No musicians found</h3>
              <p className="text-gray-500">
                {searchQuery
                  ? `No musicians match "${searchQuery}"`
                  : "Get started by adding your first musician"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
