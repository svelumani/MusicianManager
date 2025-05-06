# Architecture Overview

## 1. Overview

VAMP (Venue and Musician Platform) is a full-stack web application designed for managing musicians, venues, events, bookings, and contracts. The platform serves as a comprehensive solution for music agencies to streamline operations, from musician availability management to contract generation and event planning.

The application follows a modern client-server architecture with a React frontend and a Node.js Express backend. It employs a PostgreSQL database (via Neon serverless) for data persistence, managed through the Drizzle ORM.

## 2. System Architecture

The application follows a standard three-tier architecture:

1. **Frontend Layer**: React-based single-page application (SPA) with Tailwind CSS for styling
2. **Backend Layer**: Node.js Express server providing RESTful API endpoints
3. **Data Layer**: PostgreSQL database accessed via Drizzle ORM

### Key Architectural Characteristics

- **Monorepo Structure**: The entire application (both client and server) is contained within a single repository, allowing for shared code and simplified deployment.
- **Type Safety**: TypeScript is used throughout the application, ensuring type safety between client and server through shared schema definitions.
- **API-First Design**: Backend exposes RESTful APIs consumed by the frontend.
- **Database Abstraction**: Drizzle ORM provides a type-safe interface to the database.
- **Component-Based UI**: Frontend follows a component-based architecture with shadcn/ui components.

## 3. Key Components

### 3.1 Frontend

- **Framework**: React with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React Query for server state, React Context for application state
- **UI Components**: shadcn/ui component library based on Radix UI primitives
- **Styling**: Tailwind CSS with a custom theme
- **Form Handling**: React Hook Form with Zod for validation

The frontend is organized into:
- `client/src/components/`: Reusable UI components
- `client/src/pages/`: Page components corresponding to routes
- `client/src/layouts/`: Layout components (e.g., `AppLayout`, `AuthLayout`)
- `client/src/lib/`: Utility functions and shared logic
- `client/src/hooks/`: Custom React hooks

### 3.2 Backend

- **Framework**: Express.js with TypeScript
- **API**: RESTful API endpoints organized by domain
- **Authentication**: Session-based authentication with Passport.js
- **Email Integration**: SendGrid for transactional emails

The backend is organized into:
- `server/routes/`: API route definitions
- `server/services/`: Business logic and service implementations
- `server/db.ts`: Database connection setup
- `server/storage.ts`: Data access layer interface
- `server/DatabaseStorage.ts`: Implementation of storage interface

### 3.3 Database

- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM for database operations
- **Schema Management**: Drizzle Kit for migrations

The database schema includes entities such as:
- Users (admin authentication)
- Musicians
- Venues
- Events
- Bookings
- Contracts
- Availability
- Categories (musician, event, venue)
- Payments and Expenses

### 3.4 Authentication & Authorization

- **Authentication Method**: Session-based authentication
- **Session Storage**: PostgreSQL via connect-pg-simple
- **Authorization**: Role-based access control

## 4. Data Flow

### 4.1 Request Flow

1. **Client Requests**: The React frontend makes API requests to the Express backend using React Query.
2. **API Handling**: Express routes handle incoming requests, validating inputs and permissions.
3. **Business Logic**: Server services implement business logic and data operations.
4. **Data Access**: The storage layer (DatabaseStorage) accesses the database via Drizzle ORM.
5. **Response**: The server returns JSON responses back to the client.
6. **State Updates**: React Query updates the client-side cache with new data.

### 4.2 Key Workflows

#### Musician Management
- Musicians can be created, viewed, updated, and deleted
- Musician availability is tracked per date
- Musicians are categorized by type and skills

#### Event & Booking Management
- Events can be created with details like venue, date, and requirements
- Musicians can be invited to events
- Bookings track the relationship between musicians and events

#### Contract Management
- Monthly contracts can be generated for musicians
- Contracts can be sent via email
- Musicians can respond to contracts through unique links
- Contract status is tracked throughout the lifecycle

## 5. External Dependencies

### 5.1 Third-Party Services

- **SendGrid**: Email service for sending notifications and contracts
- **Neon Database**: Serverless PostgreSQL database service

### 5.2 Key Libraries

- **Frontend**:
  - React (UI library)
  - TanStack Query (data fetching and caching)
  - Radix UI (accessible UI primitives)
  - shadcn/ui (component library)
  - Tailwind CSS (utility-first CSS framework)
  - Zod (schema validation)
  - React Hook Form (form management)

- **Backend**:
  - Express (web framework)
  - Drizzle ORM (database ORM)
  - Passport.js (authentication)
  - date-fns (date manipulation)

## 6. Deployment Strategy

The application is configured for deployment on Replit, with the following setup:

- **Build Process**: Vite builds the frontend, while esbuild compiles the backend
- **Runtime Environment**: Node.js 20
- **Database**: PostgreSQL 16 (via Neon serverless)
- **Deployment Target**: Autoscale configuration in Replit
- **Environment Variables**: DATABASE_URL for database connection

### Development Environment

- **Development Server**: Combined dev server that serves both backend and frontend
- **Hot Module Replacement**: Enabled for frontend development
- **Database Migrations**: Handled through Drizzle Kit

### Production Environment

- **Static Assets**: Frontend is built into static assets
- **Server**: Node.js server serves both the API and static assets
- **Port Configuration**: Server runs on port 5000, exposed as port 80

## 7. Future Considerations

Areas for potential architectural improvements:

- **Caching Strategy**: Implement Redis for caching frequently accessed data
- **API Documentation**: Add OpenAPI/Swagger documentation for the API
- **Microservices**: Consider splitting into microservices for better scalability if the application grows significantly
- **Real-time Features**: Implement WebSocket for real-time notifications and updates
- **Testing**: Add comprehensive test coverage for both frontend and backend