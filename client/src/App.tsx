import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AppLayout from "@/layouts/AppLayout";
import AuthLayout from "@/layouts/AuthLayout";
import { AuthProvider } from "@/lib/auth";

// Pages
import Dashboard from "@/pages/dashboard";
import LoginPage from "@/pages/login";
import VenuesPage from "@/pages/venues/index";
import AddVenuePage from "@/pages/venues/add";
import MusiciansPage from "@/pages/musicians/index";
import AddMusicianPage from "@/pages/musicians/add";
import EventsPage from "@/pages/events/index";
import AddEventPage from "@/pages/events/add";
import InviteMusicianPage from "@/pages/events/invite";
import CategoriesPage from "@/pages/categories/index";
import AddCategoryPage from "@/pages/categories/add";
import PaymentsPage from "@/pages/payments/index";
import ReportsPage from "@/pages/reports/index";
import PlannerPage from "@/pages/planner/index";
import PlannerInvoicePage from "@/pages/planner/invoice";

function Router() {
  const [location] = useLocation();

  return (
    <Switch>
      {/* Auth routes */}
      <Route path="/login">
        <AuthLayout>
          <LoginPage />
        </AuthLayout>
      </Route>

      {/* App routes */}
      <Route path="/">
        <AppLayout>
          <Dashboard />
        </AppLayout>
      </Route>

      {/* Venues */}
      <Route path="/venues">
        <AppLayout>
          <VenuesPage />
        </AppLayout>
      </Route>
      <Route path="/venues/add">
        <AppLayout>
          <AddVenuePage />
        </AppLayout>
      </Route>

      {/* Musicians */}
      <Route path="/musicians">
        <AppLayout>
          <MusiciansPage />
        </AppLayout>
      </Route>
      <Route path="/musicians/add">
        <AppLayout>
          <AddMusicianPage />
        </AppLayout>
      </Route>

      {/* Events */}
      <Route path="/events">
        <AppLayout>
          <EventsPage />
        </AppLayout>
      </Route>
      <Route path="/events/add">
        <AppLayout>
          <AddEventPage />
        </AppLayout>
      </Route>
      <Route path="/events/:id/invite">
        {(params) => (
          <AppLayout>
            <InviteMusicianPage eventId={parseInt(params.id)} />
          </AppLayout>
        )}
      </Route>

      {/* Categories */}
      <Route path="/categories">
        <AppLayout>
          <CategoriesPage />
        </AppLayout>
      </Route>
      <Route path="/categories/add">
        <AppLayout>
          <AddCategoryPage />
        </AppLayout>
      </Route>

      {/* Payments */}
      <Route path="/payments">
        <AppLayout>
          <PaymentsPage />
        </AppLayout>
      </Route>

      {/* Reports */}
      <Route path="/reports">
        <AppLayout>
          <ReportsPage />
        </AppLayout>
      </Route>

      {/* Planner */}
      <Route path="/planner">
        <AppLayout>
          <PlannerPage />
        </AppLayout>
      </Route>
      <Route path="/planner/:id/invoice">
        {(params) => (
          <AppLayout>
            <PlannerInvoicePage />
          </AppLayout>
        )}
      </Route>

      {/* Fallback to 404 */}
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
