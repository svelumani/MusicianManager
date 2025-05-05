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
import ViewVenuePage from "@/pages/venues/view";
import EditVenuePage from "@/pages/venues/edit";
import MusiciansPage from "@/pages/musicians/index";
import AddMusicianPage from "@/pages/musicians/add";
import ViewMusicianPage from "@/pages/musicians/view";
import EditMusicianPage from "@/pages/musicians/edit";

import MusicianAvailabilityPage from "@/pages/musicians/availability";
import EventsPage from "@/pages/events/index";
import AddEventPage from "@/pages/events/add";
import ViewEventPage from "@/pages/events/view";
import EditEventPage from "@/pages/events/edit";
import EventsPlannerPage from "@/pages/events/planner";
import RateMusicianPage from "@/pages/events/rate-musician";
// Removed InviteMusicianPage import as we're handling this through the edit page
import CategoriesPage from "@/pages/categories/index";
import AddCategoryPage from "@/pages/categories/add";
import PaymentsPage from "@/pages/payments/index";
import ReportsPage from "@/pages/reports/index";
import PlannerPage from "@/pages/planner/index";
import PlannerInvoicePage from "@/pages/planner/invoice";
import MonthlyManagementPage from "@/pages/monthly/index";
import MonthlyContractsPage from "@/pages/monthly/contracts";
import ContractStatusPage from "@/pages/monthly/status";
import MonthlyContractResponsePage from "@/pages/monthly/respond";
import MonthlyContractDetailPage from "@/pages/monthly/contract-detail";
import MusicianContractPage from "@/pages/monthly/musician-contract";
import SettingsPage from "@/pages/settings/index";
import InstrumentManagerPage from "@/pages/settings/instrument-manager";
import EmailSettingsPage from "./pages/settings/email";
import EmailTemplatesPage from "./pages/settings/templates";
import ContractTemplatesPage from "./pages/settings/contract-templates";
import SharedAvailabilityView from "@/pages/availability/[token]";
import ContractsPage from "@/pages/contracts/index";
import ContractViewPage from "@/pages/contracts/view";
import ContractResponsePage from "@/pages/contracts/respond";
import ContractDetailPage from "@/pages/contracts/[id]";
import TestContractPage from "@/pages/test-contract";

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
      <Route path="/venues/edit/:id">
        {(params) => (
          <AppLayout>
            <EditVenuePage id={parseInt(params.id)} />
          </AppLayout>
        )}
      </Route>
      <Route path="/venues/:id">
        {(params) => (
          <AppLayout>
            <ViewVenuePage id={parseInt(params.id)} />
          </AppLayout>
        )}
      </Route>

      {/* Musicians */}
      <Route path="/musicians/add">
        <AppLayout>
          <AddMusicianPage />
        </AppLayout>
      </Route>
      {/* Performance metrics route has been removed */}
      <Route path="/musicians/:id/availability">
        {(params) => (
          <AppLayout>
            <MusicianAvailabilityPage />
          </AppLayout>
        )}
      </Route>
      <Route path="/musicians/:id/edit">
        {(params) => (
          <AppLayout>
            <EditMusicianPage />
          </AppLayout>
        )}
      </Route>
      <Route path="/musicians/:id">
        {(params) => (
          <AppLayout>
            <ViewMusicianPage />
          </AppLayout>
        )}
      </Route>
      <Route path="/musicians">
        <AppLayout>
          <MusiciansPage />
        </AppLayout>
      </Route>

      {/* Events */}
      <Route path="/events/add">
        <AppLayout>
          <AddEventPage />
        </AppLayout>
      </Route>
      {/* Removed /events/:id/invite route as we're handling this through the edit page */}
      <Route path="/events/:id/edit">
        {(params) => (
          <AppLayout>
            <EditEventPage />
          </AppLayout>
        )}
      </Route>
      <Route path="/events/rate-musician/:eventId/:musicianId">
        {(params) => (
          <AppLayout>
            <RateMusicianPage />
          </AppLayout>
        )}
      </Route>
      <Route path="/events/planner">
        <AppLayout>
          <EventsPlannerPage />
        </AppLayout>
      </Route>
      <Route path="/events/planner/:id/invoice">
        {(params) => (
          <AppLayout>
            <PlannerInvoicePage />
          </AppLayout>
        )}
      </Route>
      <Route path="/events/:id">
        {(params) => (
          <AppLayout>
            <ViewEventPage />
          </AppLayout>
        )}
      </Route>
      <Route path="/events">
        <AppLayout>
          <EventsPage />
        </AppLayout>
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

      {/* Planner routes */}
      <Route path="/planner">
        <AppLayout>
          <PlannerPage />
        </AppLayout>
      </Route>
      
      {/* Monthly Management */}
      <Route path="/monthly">
        <AppLayout>
          <MonthlyManagementPage />
        </AppLayout>
      </Route>
      <Route path="/monthly/contracts">
        <AppLayout>
          <MonthlyContractsPage />
        </AppLayout>
      </Route>
      <Route path="/monthly/contracts/:id">
        {(params) => (
          <AppLayout>
            <MonthlyContractDetailPage />
          </AppLayout>
        )}
      </Route>
      <Route path="/monthly/contracts/:contractId/musicians/:musicianId">
        {(params) => (
          <AppLayout>
            <MusicianContractPage />
          </AppLayout>
        )}
      </Route>
      <Route path="/monthly/status">
        <AppLayout>
          <ContractStatusPage />
        </AppLayout>
      </Route>

      {/* Settings */}
      <Route path="/settings">
        <AppLayout>
          <SettingsPage />
        </AppLayout>
      </Route>
      <Route path="/settings/instrument-manager">
        <AppLayout>
          <InstrumentManagerPage />
        </AppLayout>
      </Route>
      <Route path="/settings/musician-types">
        <AppLayout>
          <InstrumentManagerPage />
        </AppLayout>
      </Route>
      <Route path="/settings/email">
        <AppLayout>
          <EmailSettingsPage />
        </AppLayout>
      </Route>
      <Route path="/settings/templates">
        <AppLayout>
          <EmailTemplatesPage />
        </AppLayout>
      </Route>
      <Route path="/settings/contract-templates">
        <AppLayout>
          <ContractTemplatesPage />
        </AppLayout>
      </Route>
      
      {/* Contracts */}
      <Route path="/contracts/response">
        <ContractResponsePage />
      </Route>
      <Route path="/contracts/respond/:token">
        <ContractResponsePage />
      </Route>
      <Route path="/contracts/view">
        <AppLayout>
          <ContractViewPage />
        </AppLayout>
      </Route>
      <Route path="/contracts/:id">
        {(params) => (
          <AppLayout>
            {/* Using our new contract detail page with status history */}
            <ContractDetailPage />
          </AppLayout>
        )}
      </Route>
      <Route path="/contracts">
        <AppLayout>
          <ContractsPage />
        </AppLayout>
      </Route>

      {/* Public routes - no auth required */}
      <Route path="/availability/:token">
        <SharedAvailabilityView />
      </Route>
      <Route path="/monthly/respond">
        <MonthlyContractResponsePage />
      </Route>
      <Route path="/contracts/respond">
        {/* Public route to respond to contracts via token query parameter */}
        <MonthlyContractResponsePage />
      </Route>
      
      {/* Test routes */}
      <Route path="/test-contract">
        <TestContractPage />
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
