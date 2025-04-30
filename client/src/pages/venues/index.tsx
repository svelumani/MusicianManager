import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Building, Search, Plus, Star } from "lucide-react";
import type { Venue } from "@shared/schema";

export default function VenuesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();
  
  const { data: venues, isLoading } = useQuery<Venue[]>({
    queryKey: ["/api/venues"],
  });

  const filteredVenues = venues?.filter(venue => 
    venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    venue.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    venue.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Hourly Rate</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVenues.map((venue) => (
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
                        <Button variant="ghost" size="sm" onClick={() => handleViewVenue(venue.id)}>
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
