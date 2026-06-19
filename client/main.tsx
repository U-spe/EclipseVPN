import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import VpnLayout from "./components/VpnLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import { VpnProvider } from "./contexts/VpnContext";
import Activity from "./pages/Activity";
import Dashboard from "./pages/Dashboard";
import Servers from "./pages/Servers";
import Settings from "./pages/Settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/servers" component={Servers} />
      <Route path="/activity" component={Activity} />
      <Route path="/settings" component={Settings} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster
            theme="dark"
            toastOptions={{
              style: {
                background: "oklch(0.21 0.04 285 / 0.9)",
                border: "1px solid oklch(0.7 0.12 300 / 0.25)",
                color: "oklch(0.93 0.02 280)",
                backdropFilter: "blur(12px)",
              },
            }}
          />
          <VpnProvider>
            <VpnLayout>
              <Router />
            </VpnLayout>
          </VpnProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
