import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Music, Search, Plus, Star } from "lucide-react";
import type { Musician, Category } from "@shared/schema";

export default function MusiciansPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();
  
  const { data: musicians, isLoading: isLoadingMusicians } = useQuery<Musician[]>({
    queryKey: ["/api/musicians"],
  });
  
  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const getCategoryName = (categoryId: number) => {
    const category = categories?.find(c => c.id === categoryId);
    return category ? category.title : "Unknown";
  };

  const filteredMusicians = musicians?.filter(musician => 
    musician.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    musician.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getCategoryName(musician.categoryId).toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Pay Rate</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMusicians.map((musician) => (
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
                      <TableCell>{musician.type}</TableCell>
                      <TableCell>{getCategoryName(musician.categoryId)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{musician.email}</div>
                          <div className="text-gray-500">{musician.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>${musician.payRate.toFixed(2)}</TableCell>
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
                        <Button variant="ghost" size="sm" onClick={() => handleViewMusician(musician.id)}>
                          View
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
