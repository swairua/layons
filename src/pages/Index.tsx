import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { useCompanies } from '@/hooks/useDatabase';

const Index = () => {
  const { data: companies } = useCompanies();

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
