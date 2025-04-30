// This script adds 10 sample venues to the system

const sampleVenues = [
  {
    name: "Blue Note Jazz Club",
    location: "Downtown",
    address: "123 Jazz Street, Music City",
    paxCount: 150,
    description: "Premier jazz venue featuring top local and international artists in an intimate setting",
    openingHours: "6:00 PM - 2:00 AM",
    capacity: 200,
    hourlyRate: 350,
    rating: 4.8,
    venuePictures: ["https://images.unsplash.com/photo-1566737236500-c8ac43014a67?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&h=900&q=80"]
  },
  {
    name: "The Harmony Hall",
    location: "Uptown",
    address: "456 Melody Avenue, Uptown District",
    paxCount: 300,
    description: "Elegant multi-purpose hall ideal for classical concerts and orchestral performances",
    openingHours: "10:00 AM - 11:00 PM",
    capacity: 350,
    hourlyRate: 500,
    rating: 4.7,
    venuePictures: ["https://images.unsplash.com/photo-1510915361894-db8b60106cb1?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&h=900&q=80"]
  },
  {
    name: "Rhythm & Brews",
    location: "Riverside",
    address: "789 River Road, Riverside Quarter",
    paxCount: 120,
    description: "Cozy pub with a dedicated performance space for indie and folk artists",
    openingHours: "4:00 PM - 1:00 AM",
    capacity: 150,
    hourlyRate: 200,
    rating: 4.3,
    venuePictures: ["https://images.unsplash.com/photo-1514933651103-005eec06c04b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&h=900&q=80"]
  },
  {
    name: "The Grand Ballroom",
    location: "Historic District",
    address: "1 Heritage Square, Historic District",
    paxCount: 500,
    description: "Historic venue with stunning architecture perfect for large performances and galas",
    openingHours: "9:00 AM - 12:00 AM",
    capacity: 600,
    hourlyRate: 1200,
    rating: 4.9,
    venuePictures: ["https://images.unsplash.com/photo-1519167758481-83f550bb49b3?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&h=900&q=80"]
  },
  {
    name: "Soundwave Lounge",
    location: "Arts District",
    address: "234 Creative Way, Arts District",
    paxCount: 80,
    description: "Modern lounge focusing on electronic music and experimental sounds",
    openingHours: "8:00 PM - 4:00 AM",
    capacity: 100,
    hourlyRate: 300,
    rating: 4.2,
    venuePictures: ["https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&h=900&q=80"]
  },
  {
    name: "Vineyard Stage",
    location: "Wine Country",
    address: "567 Grape Lane, Wine Country",
    paxCount: 250,
    description: "Outdoor performance space set among beautiful vineyards",
    openingHours: "11:00 AM - 10:00 PM",
    capacity: 300,
    hourlyRate: 800,
    rating: 4.6,
    venuePictures: ["https://images.unsplash.com/photo-1506157786151-b8491531f063?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&h=900&q=80"]
  },
  {
    name: "The Acoustic Corner",
    location: "College District",
    address: "890 Campus Drive, College District",
    paxCount: 60,
    description: "Intimate venue perfect for solo performers and small acoustic groups",
    openingHours: "5:00 PM - 12:00 AM",
    capacity: 75,
    hourlyRate: 150,
    rating: 4.4,
    venuePictures: ["https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&h=900&q=80"]
  },
  {
    name: "Marina Pavilion",
    location: "Waterfront",
    address: "123 Harbor View, Marina District",
    paxCount: 400,
    description: "Modern pavilion with stunning water views for outdoor concerts",
    openingHours: "10:00 AM - 11:00 PM",
    capacity: 450,
    hourlyRate: 900,
    rating: 4.5,
    venuePictures: ["https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&h=900&q=80"]
  },
  {
    name: "The Jazz Cellar",
    location: "Old Town",
    address: "456 Basement Street, Old Town",
    paxCount: 90,
    description: "Underground jazz club with rich history and authentic atmosphere",
    openingHours: "7:00 PM - 3:00 AM",
    capacity: 110,
    hourlyRate: 250,
    rating: 4.8,
    venuePictures: ["https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&h=900&q=80"]
  },
  {
    name: "Skyline Rooftop Bar",
    location: "Downtown",
    address: "789 High Street, Financial District",
    paxCount: 200,
    description: "Rooftop performance space with panoramic city views",
    openingHours: "4:00 PM - 2:00 AM",
    capacity: 250,
    hourlyRate: 600,
    rating: 4.7,
    venuePictures: ["https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&h=900&q=80"]
  }
];

async function addSampleVenues() {
  const baseUrl = 'http://localhost:5000';
  let addedCount = 0;
  
  // Login first to get authentication
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    credentials: 'include'
  });
  
  if (!loginResponse.ok) {
    console.error('Error logging in:', await loginResponse.text());
    return;
  }
  
  console.log('Logged in successfully');
  
  // Add each venue
  for (const venue of sampleVenues) {
    try {
      const response = await fetch(`${baseUrl}/api/venues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(venue),
        credentials: 'include'
      });
      
      if (response.ok) {
        console.log(`Added venue: ${venue.name}`);
        addedCount++;
      } else {
        console.error(`Failed to add venue ${venue.name}:`, await response.text());
      }
    } catch (error) {
      console.error(`Error adding venue ${venue.name}:`, error.message);
    }
  }
  
  console.log(`Added ${addedCount} out of ${sampleVenues.length} venues successfully`);
}

// Run the function
addSampleVenues().catch(console.error);