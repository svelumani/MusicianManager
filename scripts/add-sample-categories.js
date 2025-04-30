// This script adds musical categories to the system

const sampleCategories = [
  {
    title: "Jazz",
    description: "Jazz musicians with expertise in traditional and contemporary jazz styles"
  },
  {
    title: "Classical",
    description: "Classical musicians including pianists, violinists, cellists and orchestral performers"
  },
  {
    title: "Rock",
    description: "Rock musicians including guitarists, bassists, drummers, and vocalists"
  },
  {
    title: "Pop",
    description: "Pop music performers with expertise in contemporary and commercial styles"
  },
  {
    title: "Folk",
    description: "Folk and acoustic musicians specializing in traditional and contemporary folk music"
  },
  {
    title: "Electronic",
    description: "Electronic music producers, DJs, and performers working with electronic instruments"
  },
  {
    title: "Blues",
    description: "Blues musicians with expertise in various blues styles and traditions"
  },
  {
    title: "Country",
    description: "Country music performers for country and western styled events"
  },
  {
    title: "R&B",
    description: "Rhythm and Blues performers specializing in soul, funk, and contemporary R&B"
  },
  {
    title: "World Music",
    description: "Musicians specializing in music from around the world including ethnic and cultural traditions"
  }
];

async function addSampleCategories() {
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
  
  // Add each category
  for (const category of sampleCategories) {
    try {
      const response = await fetch(`${baseUrl}/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(category),
        credentials: 'include'
      });
      
      if (response.ok) {
        console.log(`Added category: ${category.title}`);
        addedCount++;
      } else {
        console.error(`Failed to add category ${category.title}:`, await response.text());
      }
    } catch (error) {
      console.error(`Error adding category ${category.title}:`, error.message);
    }
  }
  
  console.log(`Added ${addedCount} out of ${sampleCategories.length} categories successfully`);

  // Return the login response cookies to be used in other scripts
  return loginResponse.headers.get('set-cookie');
}

// Run the function
addSampleCategories().catch(console.error);