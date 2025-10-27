import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import { enableResizeObserverErrorSuppression } from "@/utils/resizeObserverErrorHandler";
import { useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { ensureDatabaseFunctionsExist } from "@/utils/ensureDatabaseFunctions";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Quotations from "./pages/Quotations";
import Invoices from "./pages/Invoices";
import Payments from "./pages/Payments";
import Inventory from "./pages/Inventory";
import Customers from "./pages/Customers";
import DeliveryNotes from "./pages/DeliveryNotes";
import Proforma from "./pages/Proforma";
import SalesReports from "./pages/reports/SalesReports";
import InventoryReports from "./pages/reports/InventoryReports";
import StatementOfAccounts from "./pages/reports/StatementOfAccounts";
import CompanySettings from "./pages/settings/CompanySettings";
import UserManagement from "./pages/settings/UserManagement";
import UnitsSettings from "./pages/settings/Units";
import UnitsNormalize from "./pages/settings/UnitsNormalize";
import RemittanceAdvice from "./pages/RemittanceAdvice";
import LPOs from "./pages/LPOs";
import BOQs from "./pages/BOQs";
import FixedBOQ from "./pages/FixedBOQ";
import CreditNotes from "./pages/CreditNotes";
import NotFound from "./pages/NotFound";
import PaymentSynchronizationPage from "./pages/PaymentSynchronization";
import OptimizedInventory from "./pages/OptimizedInventory";
import PerformanceOptimizerPage from "./pages/PerformanceOptimizerPage";
import OptimizedCustomers from "./pages/OptimizedCustomers";
import CustomerPerformanceOptimizerPage from "./pages/CustomerPerformanceOptimizerPage";
import SetupAndTest from "./components/SetupAndTest";
import AuthTest from "./components/AuthTest";
import AdminRecreate from "./pages/AdminRecreate";

const App = () => {

  useEffect(() => {
    // Suppress ResizeObserver loop errors
    enableResizeObserverErrorSuppression();

    // Ensure database functions exist on app startup (non-blocking)
    // Wrapped in try-catch to prevent startup failures
    try {
      ensureDatabaseFunctionsExist().catch((err) => {
        console.error('Database function initialization failed:', err);
      });
    } catch (err) {
      console.error('Error calling ensureDatabaseFunctionsExist:', err);
    }
  }, []);

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Layout>
        <Routes>
          {/* Dashboard */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } 
          />

          {/* Sales & Customer Management */}
          <Route 
            path="/quotations" 
            element={
              <ProtectedRoute>
                <Quotations />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/quotations/new" 
            element={
              <ProtectedRoute>
                <Quotations />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/customers" 
            element={
              <ProtectedRoute>
                <Customers />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/customers/new" 
            element={
              <ProtectedRoute>
                <Customers />
              </ProtectedRoute>
            } 
          />

          {/* Financial Management */}
          <Route 
            path="/invoices" 
            element={
              <ProtectedRoute>
                <Invoices />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/invoices/new" 
            element={
              <ProtectedRoute>
                <Invoices />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/payments" 
            element={
              <ProtectedRoute>
                <Payments />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/payments/new" 
            element={
              <ProtectedRoute>
                <Payments />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/credit-notes" 
            element={
              <ProtectedRoute>
                <CreditNotes />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/credit-notes/new" 
            element={
              <ProtectedRoute>
                <CreditNotes />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/proforma" 
            element={
              <ProtectedRoute>
                <Proforma />
              </ProtectedRoute>
            } 
          />

          {/* Procurement & Inventory */}
          <Route
            path="/boqs"
            element={
              <ProtectedRoute>
                <BOQs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/fixed-boq"
            element={
              <ProtectedRoute>
                <FixedBOQ />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lpos"
            element={
              <ProtectedRoute>
                <LPOs />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/lpos/new" 
            element={
              <ProtectedRoute>
                <LPOs />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/inventory" 
            element={
              <ProtectedRoute>
                <Inventory />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/inventory/new" 
            element={
              <ProtectedRoute>
                <Inventory />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/delivery-notes" 
            element={
              <ProtectedRoute>
                <DeliveryNotes />
              </ProtectedRoute>
            } 
          />

          {/* Additional Features */}
          <Route 
            path="/remittance" 
            element={
              <ProtectedRoute>
                <RemittanceAdvice />
              </ProtectedRoute>
            } 
          />

          {/* Reports */}
          <Route 
            path="/reports/sales" 
            element={
              <ProtectedRoute>
                <SalesReports />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reports/inventory" 
            element={
              <ProtectedRoute>
                <InventoryReports />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reports/statements" 
            element={
              <ProtectedRoute>
                <StatementOfAccounts />
              </ProtectedRoute>
            } 
          />

          {/* Settings */}
          <Route
            path="/settings/company"
            element={
              <ProtectedRoute>
                <CompanySettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/users"
            element={
              <ProtectedRoute>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/units"
            element={
              <ProtectedRoute>
                <UnitsSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/units/normalize"
            element={
              <ProtectedRoute>
                <UnitsNormalize />
              </ProtectedRoute>
            }
          />

          <Route
            path="/setup-test"
            element={
              <ProtectedRoute>
                <SetupAndTest />
              </ProtectedRoute>
            }
          />

          {/* Authentication Test - No protection needed */}
          <Route path="/auth-test" element={<AuthTest />} />

          {/* Admin recreate (one-time utility) - No protection needed */}
          <Route path="/admin-recreate" element={<AdminRecreate />} />

          {/* Payment Synchronization - No protection needed for setup */}
          <Route path="/payment-sync" element={<PaymentSynchronizationPage />} />


          {/* Optimized Inventory - Performance-optimized inventory page */}
          <Route
            path="/optimized-inventory"
            element={
              <ProtectedRoute>
                <OptimizedInventory />
              </ProtectedRoute>
            }
          />

          {/* Performance Optimizer - Database and inventory performance optimization */}
          <Route path="/performance-optimizer" element={<PerformanceOptimizerPage />} />


          {/* Optimized Customers - Performance-optimized customers page */}
          <Route
            path="/optimized-customers"
            element={
              <ProtectedRoute>
                <OptimizedCustomers />
              </ProtectedRoute>
            }
          />

          {/* Customer Performance Optimizer - Database and customer performance optimization */}
          <Route path="/customer-performance-optimizer" element={<CustomerPerformanceOptimizerPage />} />




          {/* 404 Page */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </TooltipProvider>
  );
};

export default App;
