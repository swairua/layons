import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useCurrentCompany } from "@/contexts/CompanyContext";
import { setFavicon } from "@/utils/setFavicon";

// Lazy load the page components to reduce initial bundle size and startup time
import { lazy, Suspense } from "react";

const Index = lazy(() => import("./pages/Index"));
const Quotations = lazy(() => import("./pages/Quotations"));
const Invoices = lazy(() => import("./pages/Invoices"));
const Payments = lazy(() => import("./pages/Payments"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Customers = lazy(() => import("./pages/Customers"));
const DeliveryNotes = lazy(() => import("./pages/DeliveryNotes"));
const Proforma = lazy(() => import("./pages/Proforma"));
const SalesReports = lazy(() => import("./pages/reports/SalesReports"));
const InventoryReports = lazy(() => import("./pages/reports/InventoryReports"));
const StatementOfAccounts = lazy(() => import("./pages/reports/StatementOfAccounts"));
const CompanySettings = lazy(() => import("./pages/settings/CompanySettings"));
const UserManagement = lazy(() => import("./pages/settings/UserManagement"));
const UnitsSettings = lazy(() => import("./pages/settings/Units"));
const UnitsNormalize = lazy(() => import("./pages/settings/UnitsNormalize"));
const RemittanceAdvice = lazy(() => import("./pages/RemittanceAdvice"));
const LPOs = lazy(() => import("./pages/LPOs"));
const BOQs = lazy(() => import("./pages/BOQs"));
const FixedBOQ = lazy(() => import("./pages/FixedBOQ"));
const CreditNotes = lazy(() => import("./pages/CreditNotes"));
const CashReceipts = lazy(() => import("./pages/CashReceipts"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PaymentSynchronizationPage = lazy(() => import("./pages/PaymentSynchronization"));
const OptimizedInventory = lazy(() => import("./pages/OptimizedInventory"));
const PerformanceOptimizerPage = lazy(() => import("./pages/PerformanceOptimizerPage"));
const OptimizedCustomers = lazy(() => import("./pages/OptimizedCustomers"));
const CustomerPerformanceOptimizerPage = lazy(() => import("./pages/CustomerPerformanceOptimizerPage"));
const SetupAndTest = lazy(() => import("./components/SetupAndTest"));
const AuthTest = lazy(() => import("./components/AuthTest"));
const AdminRecreate = lazy(() => import("./pages/AdminRecreate"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));

const App = () => {

  useEffect(() => {
    // Initialize on app startup
    // Non-blocking async initialization
  }, []);

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Layout>
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
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
            path="/cash-receipts"
            element={
              <ProtectedRoute>
                <CashReceipts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cash-receipts/new"
            element={
              <ProtectedRoute>
                <CashReceipts />
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

          {/* Audit Logs */}
          <Route
            path="/audit-logs"
            element={
              <ProtectedRoute>
                <AuditLogs />
              </ProtectedRoute>
            }
          />

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
        </Suspense>
      </Layout>
    </TooltipProvider>
  );
};

export default App;
