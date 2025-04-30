// This script adds 25 sample musicians with complete details to the system

const sampleMusicians = [
  // Jazz Musicians
  {
    name: "Robert Johnson",
    email: "robert.j@example.com",
    phone: "555-123-4567",
    type: "Jazz Pianist",
    payRate: 120,
    categoryId: 1, // Jazz
    instruments: ["Piano", "Keyboard", "Organ", "Accordion"],
    profileImage: "https://images.unsplash.com/photo-1549213783-8284d0336c4f?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    bio: "Robert is an acclaimed jazz pianist with over 15 years of experience performing at prestigious venues across the country. He specializes in bebop and contemporary jazz styles.",
    rating: 4.8
  },
  {
    name: "Ella Thompson",
    email: "ella.t@example.com",
    phone: "555-234-5678",
    type: "Jazz Vocalist",
    payRate: 150,
    categoryId: 1, // Jazz
    instruments: ["Vocals", "Piano", "Ukulele"],
    profileImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    bio: "Ella is a versatile jazz vocalist with a rich, soulful tone. She has performed with numerous jazz ensembles and can cover everything from standards to modern compositions.",
    rating: 4.9
  },
  
  // Classical Musicians
  {
    name: "David Chen",
    email: "david.c@example.com",
    phone: "555-345-6789",
    type: "Violinist",
    payRate: 140,
    categoryId: 2, // Classical
    instruments: ["Violin", "Viola", "Mandolin"],
    profileImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    bio: "David is a classically trained violinist with a master's degree from Juilliard. He has performed with several symphony orchestras and specializes in both classical and contemporary repertoire.",
    rating: 5.0
  },
  {
    name: "Maria Rodriguez",
    email: "maria.r@example.com",
    phone: "555-456-7890",
    type: "Cellist",
    payRate: 135,
    categoryId: 2, // Classical
    instruments: ["Cello", "Bass", "Double Bass"],
    profileImage: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    bio: "Maria is a passionate cellist with a warm, expressive tone. Her performances blend technical precision with emotional depth, making her perfect for both solo and ensemble works.",
    rating: 4.7
  },
  {
    name: "Thomas Weber",
    email: "thomas.w@example.com",
    phone: "555-567-8901",
    type: "Classical Pianist",
    payRate: 160,
    categoryId: 2, // Classical
    instruments: ["Piano", "Harpsichord", "Pipe Organ"],
    profileImage: "https://images.unsplash.com/photo-1500048993953-d23a436266cf?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    bio: "Thomas is a distinguished classical pianist with international performance experience. His repertoire spans from Bach to contemporary composers, with a special focus on Romantic-era pieces.",
    rating: 4.9
  },
  
  // Rock Musicians
  {
    name: "Jack Wilson",
    email: "jack.w@example.com",
    phone: "555-678-9012",
    type: "Rock Guitarist",
    payRate: 110,
    categoryId: 3, // Rock
    instruments: ["Electric Guitar", "Acoustic Guitar", "Lap Steel Guitar", "12-String Guitar"],
    profileImage: "https://images.unsplash.com/photo-1552058544-f2b08422138a?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    bio: "Jack is an energetic rock guitarist with a powerful stage presence. His versatile playing style covers everything from classic rock to modern alternative, making him perfect for any rock-oriented event.",
    rating: 4.6
  },
  {
    name: "Sarah Davis",
    email: "sarah.d@example.com",
    phone: "555-789-0123",
    type: "Rock Vocalist",
    payRate: 125,
    categoryId: 3, // Rock
    instruments: ["Vocals", "Guitar", "Bass Guitar", "Theremin"],
    profileImage: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    bio: "Sarah is a dynamic rock vocalist with a powerful range. She has fronted several successful bands and can deliver everything from classic rock anthems to modern rock hits.",
    rating: 4.8
  },
  
  // Pop Musicians
  {
    name: "Michael Brown",
    email: "michael.b@example.com",
    phone: "555-890-1234",
    type: "Pop Vocalist",
    payRate: 130,
    categoryId: 4, // Pop
    instruments: ["Vocals", "Guitar", "Piano", "Loop Station", "Keytar"],
    profileImage: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    bio: "Michael is a versatile pop vocalist with a contemporary sound. His extensive repertoire of current and classic hits makes him perfect for weddings, corporate events, and private parties.",
    rating: 4.7
  },
  {
    name: "Emily Wilson",
    email: "emily.w@example.com",
    phone: "555-901-2345",
    type: "Pop Pianist/Vocalist",
    payRate: 145,
    categoryId: 4, // Pop
    instruments: ["Piano", "Vocals", "Keyboard", "Melodica", "Digital Workstation"],
    profileImage: "https://images.unsplash.com/photo-1554151228-14d9def656e4?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    bio: "Emily is a talented pianist and vocalist specializing in contemporary pop music. Her ability to perform solo or lead a band makes her extremely versatile for any entertainment needs.",
    rating: 4.9
  },
  
  // Folk Musicians
  {
    name: "James Wilson",
    email: "james.w@example.com",
    phone: "555-012-3456",
    type: "Folk Guitarist/Vocalist",
    payRate: 105,
    categoryId: 5, // Folk
    instruments: ["Acoustic Guitar", "Vocals", "Harmonica", "Banjo", "Dulcimer"],
    profileImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    bio: "James is an authentic folk musician with a warm, inviting stage presence. His performances blend traditional folk songs with contemporary acoustic music, perfect for intimate venues.",
    rating: 4.5
  },
  {
    name: "Sophia Anderson",
    email: "sophia.a@example.com",
    phone: "555-123-4567",
    type: "Folk Fiddler",
    payRate: 115,
    categoryId: 5, // Folk
    instruments: ["Violin", "Fiddle", "Mandolin", "Celtic Harp", "Tin Whistle"],
    profileImage: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    bio: "Sophia is a spirited folk fiddler whose playing brings traditional music to life. Her extensive repertoire of jigs, reels, and folk melodies makes her perfect for cultural events and celebrations.",
    rating: 4.6
  },
  
  // Electronic Musicians
  {
    name: "Alex Kim",
    email: "alex.k@example.com",
    phone: "555-234-5678",
    type: "DJ/Producer",
    payRate: 180,
    categoryId: 6, // Electronic
    instruments: ["Turntables", "Synthesizer", "Sampler", "Ableton Push", "Drum Machine", "MIDI Controllers"],
    profileImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    bio: "Alex is a cutting-edge DJ and electronic music producer specializing in house, techno, and EDM. His immersive sets create the perfect atmosphere for clubs, festivals, and modern events.",
    rating: 4.8
  },
  {
    name: "Olivia Chen",
    email: "olivia.c@example.com",
    phone: "555-345-6789",
    type: "Electronic Music Artist",
    payRate: 160,
    categoryId: 6, // Electronic
    instruments: ["Synthesizer", "Drum Machine", "Laptop", "Modular Synth", "Vocoder", "Launchpad"],
    profileImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    bio: "Olivia creates innovative electronic soundscapes that blend ambient textures with driving beats. Her performances feature live electronic instruments for a unique and engaging experience.",
    rating: 4.7
  },
  
  // Blues Musicians
  {
    name: "Samuel Washington",
    email: "samuel.w@example.com",
    phone: "555-456-7890",
    type: "Blues Guitarist",
    payRate: 125,
    categoryId: 7, // Blues
    instruments: ["Electric Guitar", "Slide Guitar", "Acoustic Guitar", "Resonator Guitar", "Cigar Box Guitar"],
    profileImage: "https://images.unsplash.com/photo-1500048993953-d23a436266cf?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    bio: "Samuel is a soulful blues guitarist with decades of experience. His authentic playing style and deep knowledge of blues traditions make him perfect for blues clubs and festivals.",
    rating: 4.9
  },
  {
    name: "Grace Johnson",
    email: "grace.j@example.com",
    phone: "555-567-8901",
    type: "Blues Singer",
    payRate: 130,
    categoryId: 7, // Blues
    instruments: ["Vocals", "Piano", "Hammond Organ", "Washboard"],
    profileImage: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    bio: "Grace possesses a powerful, soulful voice perfectly suited for blues and soul music. Her emotional performances draw from both classic and contemporary blues traditions.",
    rating: 4.8
  },
  
  // Country Musicians
  {
    name: "Daniel Miller",
    email: "daniel.m@example.com",
    phone: "555-678-9012",
    type: "Country Guitarist/Vocalist",
    payRate: 115,
    categoryId: 8, // Country
    instruments: ["Acoustic Guitar", "Electric Guitar", "Vocals", "Banjo", "Pedal Steel Guitar", "Dobro"],
    profileImage: "https://images.unsplash.com/photo-1552058544-f2b08422138a?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    bio: "Daniel brings authentic country music to life with his skillful guitar playing and warm vocal style. His repertoire spans classic country, western, and modern country hits.",
    rating: 4.6
  },
  {
    name: "Emma Taylor",
    email: "emma.t@example.com",
    phone: "555-789-0123",
    type: "Country Singer",
    payRate: 125,
    categoryId: 8, // Country
    instruments: ["Vocals", "Acoustic Guitar", "Autoharp", "Mandolin"],
    profileImage: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    bio: "Emma is a versatile country vocalist with a genuine delivery and engaging stage presence. She specializes in contemporary country music with a traditional sensibility.",
    rating: 4.7
  },
  
  // R&B Musicians
  {
    name: "Marcus Johnson",
    email: "marcus.j@example.com",
    phone: "555-890-1234",
    type: "R&B Vocalist",
    payRate: 140,
    categoryId: 9, // R&B
    instruments: ["Vocals", "Keyboard", "MIDI Controller", "Talk Box"],
    profileImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    bio: "Marcus is a soulful R&B vocalist with a smooth, expressive style. His performances range from classic soul to contemporary R&B, perfect for upscale events and intimate venues.",
    rating: 4.8
  },
  {
    name: "Zoe Williams",
    email: "zoe.w@example.com",
    phone: "555-901-2345",
    type: "Soul Singer",
    payRate: 145,
    categoryId: 9, // R&B
    instruments: ["Vocals", "Tambourine", "Keyboard", "Electric Piano"],
    profileImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    bio: "Zoe possesses a powerful, expressive voice perfectly suited for soul and R&B music. Her dynamic performances captivate audiences with both emotional depth and technical skill.",
    rating: 4.9
  },
  
  // World Music Musicians
  {
    name: "Raj Patel",
    email: "raj.p@example.com",
    phone: "555-012-3456",
    type: "Sitar Player",
    payRate: 135,
    categoryId: 10, // World Music
    instruments: ["Sitar", "Tabla", "Tanpura", "Harmonium", "Sarod"],
    profileImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    bio: "Raj is a masterful sitar player trained in the classical Indian tradition. His performances blend traditional ragas with contemporary influences, perfect for cultural events and meditative settings.",
    rating: 4.8
  },
  {
    name: "Isabella Martinez",
    email: "isabella.m@example.com",
    phone: "555-123-4567",
    type: "Flamenco Guitarist",
    payRate: 140,
    categoryId: 10, // World Music
    instruments: ["Spanish Guitar", "Cajon", "Castanets", "Palmas"],
    profileImage: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    bio: "Isabella is a passionate flamenco guitarist with deep roots in Spanish musical traditions. Her fiery performances bring authentic flamenco energy to any venue or cultural celebration.",
    rating: 4.9
  },
  {
    name: "Kofi Mensah",
    email: "kofi.m@example.com",
    phone: "555-234-5678",
    type: "African Percussion",
    payRate: 120,
    categoryId: 10, // World Music
    instruments: ["Djembe", "Talking Drum", "Calabash", "Balafon", "Shekere", "Kora"],
    profileImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    bio: "Kofi is a master of West African percussion with decades of experience. His rhythmic performances are both educational and entertaining, perfect for cultural events and celebrations.",
    rating: 4.7
  },
  {
    name: "Yuki Tanaka",
    email: "yuki.t@example.com",
    phone: "555-345-6789",
    type: "Koto Player",
    payRate: 130,
    categoryId: 10, // World Music
    instruments: ["Koto", "Shamisen", "Shakuhachi", "Taiko Drums"],
    profileImage: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    bio: "Yuki is an accomplished performer of traditional Japanese string instruments. Her elegant koto playing brings the beauty of Japanese classical music to cultural events and ceremonies.",
    rating: 4.8
  },
  {
    name: "Carlos Fernandez",
    email: "carlos.f@example.com",
    phone: "555-456-7890",
    type: "Latin Percussionist",
    payRate: 125,
    categoryId: 10, // World Music
    instruments: ["Congas", "Bongos", "Timbales", "Cajon", "Guiro", "Maracas", "Claves"],
    profileImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    bio: "Carlos is a dynamic Latin percussionist skilled in various percussion styles from Cuba, Brazil, and Puerto Rico. His rhythmic expertise adds authentic Latin flavor to any ensemble or event.",
    rating: 4.7
  }
];

async function addSampleMusicians() {
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
  
  // Add each musician
  for (const musician of sampleMusicians) {
    try {
      const response = await fetch(`${baseUrl}/api/musicians`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(musician),
        credentials: 'include'
      });
      
      if (response.ok) {
        console.log(`Added musician: ${musician.name} (${musician.type})`);
        addedCount++;
      } else {
        const errorText = await response.text();
        console.error(`Failed to add musician ${musician.name}:`, errorText);
      }
    } catch (error) {
      console.error(`Error adding musician ${musician.name}:`, error.message);
    }
  }
  
  console.log(`Added ${addedCount} out of ${sampleMusicians.length} musicians successfully`);
}

// Run the function
addSampleMusicians().catch(console.error);