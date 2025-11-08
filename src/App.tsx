import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
// DataProvider is now imported and used in main.tsx, so no longer needed here
// import { DataProvider } from "./context/DataContext";
import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Suppliers from "./pages/Suppliers";
import Customers from "./pages/Customers";
import Warehouses from "./pages/Warehouses";
import IncomingPayments from "./pages/IncomingPayments";
import OutgoingPayments from "./pages/OutgoingPayments";
import ProductMovement from "./pages/ProductMovement";
import PurchaseOrders from "./pages/PurchaseOrders"; // New import
import SellOrders from "./pages/SellOrders";       // New import
import Finance from "./pages/Finance";             // New import
import Profitability from "./pages/Profitability"; // New import
import DataImportExport from "./pages/DataImportExport"; // New import
import SettingsPage from "./pages/Settings";       // New import (renamed to avoid conflict with 'Settings' type)
// Removed RecycleBin import
import NotFound from "./pages/NotFound";
import { MOCK_CURRENT_DATE } from "./context/DataContext"; // Import MOCK_CURRENT_DATE

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        {/* DataProvider removed from here */}
          <Routes>
            <Route path="/" element={<MainLayout><Dashboard /></MainLayout>} />
            <Route path="/products" element={<MainLayout><Products /></MainLayout>} />
            <Route path="/purchase-orders" element={<MainLayout><PurchaseOrders /></MainLayout>} /> {/* New Route */}
            <Route path="/sell-orders" element={<MainLayout><SellOrders /></MainLayout>} />       {/* New Route */}
            <Route path="/suppliers" element={<MainLayout><Suppliers /></MainLayout>} />
            <Route path="/customers" element={<MainLayout><Customers /></MainLayout>} />
            <Route path="/incoming-payments" element={<MainLayout><IncomingPayments /></MainLayout>} />
            <Route path="/outgoing-payments" element={<MainLayout><OutgoingPayments /></MainLayout>} />
            <Route path="/warehouses" element={<MainLayout><Warehouses /></MainLayout>} />
            <Route path="/product-movement" element={<MainLayout><ProductMovement /></MainLayout>} />
            <Route path="/finance" element={<MainLayout><Finance /></MainLayout>} />             {/* New Route */}
            <Route path="/profitability" element={<MainLayout><Profitability /></MainLayout>} /> {/* New Route */}
            <Route path="/data-import-export" element={<MainLayout><DataImportExport /></MainLayout>} /> {/* New Route */}
            <Route path="/settings" element={<MainLayout><SettingsPage /></MainLayout>} />       {/* New Route */}
            {/* Removed Recycle Bin Route */}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;