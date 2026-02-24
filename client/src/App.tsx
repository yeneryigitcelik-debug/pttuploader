import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";

import Dashboard from "@/pages/Dashboard";
import Jobs from "@/pages/Jobs";
import JobDetail from "@/pages/JobDetail";
import Mappings from "@/pages/Mappings";
import UploadPDFs from "@/pages/UploadPDFs";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Layout><Dashboard /></Layout>
      </Route>

      <Route path="/upload">
        <Layout><UploadPDFs /></Layout>
      </Route>

      <Route path="/jobs">
        <Layout><Jobs /></Layout>
      </Route>

      <Route path="/jobs/:id">
        <Layout><JobDetail /></Layout>
      </Route>

      <Route path="/mappings">
        <Layout><Mappings /></Layout>
      </Route>

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
