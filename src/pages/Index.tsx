import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { AuthPerformanceTest } from '@/components/auth/AuthPerformanceTest';
import { Button } from '@/components/ui/button';
import { FileText, BarChart3 } from 'lucide-react';
import { DatabaseStatusBanner } from '@/components/DatabaseStatusBanner';
import { downloadQuotationPDF } from '@/utils/pdfGenerator';
import { useQuotations, useCompanies } from '@/hooks/useDatabase';
import { useState } from 'react';
import { toast } from 'sonner';

const Index = () => {
  const { data: companies } = useCompanies();
  const currentCompany = companies?.[0];
  const { data: quotations } = useQuotations(currentCompany?.id);
  const [showAuthPerformance, setShowAuthPerformance] = useState(false);

  const handleTestPDF = async () => {
    try {
      // Get company details for PDF
      const companyDetails = currentCompany ? {
        name: currentCompany.name,
        address: currentCompany.address,
        city: currentCompany.city,
        country: currentCompany.country,
        phone: currentCompany.phone,
        email: currentCompany.email,
        tax_number: currentCompany.tax_number,
        logo_url: currentCompany.logo_url,
        header_image: currentCompany.header_image,
        stamp_image: currentCompany.stamp_image,
        company_services: currentCompany.company_services
      } : undefined;

      // Use real quotation data if available, otherwise use test data
      const realQuotation = quotations?.[0];

      if (realQuotation) {
        await downloadQuotationPDF(realQuotation, companyDetails);
        toast.success('PDF generated.');
        return;
      }

      // Fallback to test quotation data for demonstration
      const testQuotation = {
        id: 'test-123',
        quotation_number: 'QUO-2024-001',
        quotation_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        total_amount: 150000,
        subtotal: 125000,
        tax_amount: 25000,
        status: 'draft',
        notes: 'This is a test quotation to demonstrate the company logo in PDF documents.',
        terms_and_conditions: 'Payment due within 30 days of acceptance.',
        customers: {
          name: 'Sample Customer Ltd',
          email: 'customer@example.com',
          phone: '+254 700 000 000',
          address: '123 Business Avenue',
          city: 'Nairobi',
          country: 'Kenya'
        },
        quotation_items: [
          {
            description: 'Medical Equipment - Blood Pressure Monitor',
            quantity: 5,
            unit_price: 15000,
            tax_percentage: 16,
            tax_amount: 12000,
            line_total: 87000
          },
          {
            description: 'Surgical Gloves (Box of 100)',
            quantity: 10,
            unit_price: 2500,
            tax_percentage: 16,
            tax_amount: 4000,
            line_total: 29000
          },
          {
            description: 'Digital Thermometer',
            quantity: 8,
            unit_price: 3500,
            tax_percentage: 16,
            tax_amount: 4480,
            line_total: 32480
          }
        ]
      };

      await downloadQuotationPDF(testQuotation, companyDetails);
      toast.success('Test PDF generated using sample data');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your business today.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleTestPDF}
            variant="outline"
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          >
            <FileText className="h-4 w-4 mr-2" />
            {quotations?.length ? 'Download Sample PDF' : 'Test PDF Generation'}
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowAuthPerformance(!showAuthPerformance)}
            className="border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {showAuthPerformance ? 'Hide' : 'Show'} Performance
          </Button>
        </div>
      </div>

      {/* Database Status */}
      <DatabaseStatusBanner />

      {/* Dashboard Stats */}
      <DashboardStats />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Takes 2/3 of the space */}
        <div className="lg:col-span-2 space-y-6">
          <RecentActivity />
        </div>

        {/* Right Column - Takes 1/3 of the space */}
        <div className="space-y-6">
          <QuickActions />

          {/* Auth Performance Monitor - Toggle visibility */}
          {showAuthPerformance && (
            <div className="transition-all duration-300 ease-in-out">
              <AuthPerformanceTest />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
