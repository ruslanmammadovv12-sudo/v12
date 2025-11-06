import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DataProvider } from "./context/DataContext";
import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Suppliers from "./pages/Suppliers";
import Customers from "./pages/Customers";
import Warehouses from "./pages/Warehouses";
import IncomingPayments from "./pages/IncomingPayments"; // Import IncomingPayments page
import OutgoingPayments from "./pages/OutgoingPayments"; // Import OutgoingPayments page
import ProductMovement from "./pages/ProductMovement"; // Import ProductMovement page
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <DataProvider>
          <Routes>
            <Route path="/" element={<MainLayout><Dashboard /></MainLayout>} />
            <Route path="/products" element={<MainLayout><Products /></MainLayout>} />
            <Route path="/suppliers" element={<MainLayout><Suppliers /></MainLayout>} />
            <Route path="/customers" element={<MainLayout><Customers /></MainLayout>} />
            <Route path="/warehouses" element={<MainLayout><Warehouses /></MainLayout>} />
            <Route path="/incoming-payments" element={<MainLayout><IncomingPayments /></MainLayout>} /> {/* New Incoming Payments Route */}
            <Route path="/outgoing-payments" element={<MainLayout><OutgoingPayments /></MainLayout>} /> {/* New Outgoing Payments Route */}
            <Route path="/product-movement" element={<MainLayout><ProductMovement /></MainLayout>} /> {/* New Product Movement Route */}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </DataProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;