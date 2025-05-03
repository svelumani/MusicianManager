import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Building, Search, Plus, Star, ArrowUpDown, Edit } from "lucide-react";
import type { Venue } from "@shared/schema";

type SortField = 'name' | 'location' | 'capacity' | 'rating' | 'hourlyRate';

export default function VenuesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const { data: venues, isLoading } = useQuery<Venue[]>({
    queryKey: ["/api/venues"],
  });

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

  // First filter venues based on search query
  const filteredVenues = venues?.filter(venue => 
    venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    venue.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    venue.address.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Then sort the filtered venues
  const sortedVenues = filteredVenues ? [...filteredVenues].sort((a, b) => {
    if (sortField === 'name') {
      return sortDirection === 'asc' 
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    } 
    else if (sortField === 'location') {
      return sortDirection === 'asc'
        ? a.location.localeCompare(b.location)
        : b.location.localeCompare(a.location);
    }
    else if (sortField === 'capacity') {
      // Handle null capacities - sort them last
      if (a.capacity === null && b.capacity === null) return 0;
      if (a.capacity === null) return sortDirection === 'asc' ? 1 : -1;
      if (b.capacity === null) return sortDirection === 'asc' ? -1 : 1;
      
      return sortDirection === 'asc'
        ? a.capacity - b.capacity
        : b.capacity - a.capacity;
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
    else if (sortField === 'hourlyRate') {
      // Handle null hourly rates - sort them last
      if (a.hourlyRate === null && b.hourlyRate === null) return 0;
      if (a.hourlyRate === null) return sortDirection === 'asc' ? 1 : -1;
      if (b.hourlyRate === null) return sortDirection === 'asc' ? -1 : 1;
      
      return sortDirection === 'asc'
        ? a.hourlyRate - b.hourlyRate
        : b.hourlyRate - a.hourlyRate;
    }
    return 0;
  }) : [];

  const handleViewVenue = (id: number) => {
    navigate(`/venues/${id}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Venues</h1>
        <Link href="/venues/add">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add Venue
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Venue Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search venues by name, location or address..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="h-80 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredVenues && filteredVenues.length > 0 ? (
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
                      onClick={() => handleSort('location')}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <div className="flex items-center">
                        Location {getSortIcon('location')}
                      </div>
                    </TableHead>
                    <TableHead 
                      onClick={() => handleSort('capacity')}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <div className="flex items-center">
                        Capacity {getSortIcon('capacity')}
                      </div>
                    </TableHead>
                    <TableHead 
                      onClick={() => handleSort('rating')}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <div className="flex items-center">
                        Rating {getSortIcon('rating')}
                      </div>
                    </TableHead>
                    <TableHead 
                      onClick={() => handleSort('hourlyRate')}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <div className="flex items-center">
                        Hourly Rate {getSortIcon('hourlyRate')}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedVenues.map((venue) => (
                    <TableRow key={venue.id}>
                      <TableCell className="font-medium">{venue.name}</TableCell>
                      <TableCell>{venue.location}</TableCell>
                      <TableCell>{venue.capacity || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-500 mr-1" />
                          {venue.rating ? venue.rating.toFixed(1) : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>${venue.hourlyRate ? venue.hourlyRate.toFixed(2) : 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleViewVenue(venue.id)}>
                            View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => navigate(`/venues/${venue.id}/edit`)}
                          >
                            <Edit className="h-4 w-4 mr-1" /> Edit
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
              <Building className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No venues found</h3>
              <p className="text-gray-500">
                {searchQuery
                  ? `No venues match "${searchQuery}"`
                  : "Get started by adding your first venue"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
