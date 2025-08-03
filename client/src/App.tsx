import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import FeedbackForm from "@/pages/feedback";
import SurveyBuilder from "@/pages/survey-builder";
import QRManagement from "@/pages/qr-management";
import CompanyOnboarding from "@/pages/company-onboarding";
import BranchManagement from "@/pages/branch-management";
import OnboardingLanding from "@/pages/onboarding-landing";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={OnboardingLanding} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/feedback" component={FeedbackForm} />
      <Route path="/survey-builder" component={SurveyBuilder} />
      <Route path="/qr-management" component={QRManagement} />
      <Route path="/company-onboarding" component={CompanyOnboarding} />
      <Route path="/branch-management" component={BranchManagement} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
