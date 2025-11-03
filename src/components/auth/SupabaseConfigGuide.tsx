import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Database, AlertTriangle } from 'lucide-react';

export function SupabaseConfigGuide() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            PHP API Backend Setup
          </CardTitle>
          <CardDescription>
            Your application is configured to use a PHP API backend with MySQLi database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>✅ All configured correctly:</strong> Your application is using the PHP API backend with direct MySQLi database access. No additional configuration is needed.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h3 className="font-semibold">Backend Architecture:</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Frontend: React with TypeScript</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Backend API: PHP (api.php)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Database: MySQL with MySQLi driver</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Data Layer: QueryBuilder routing through layonsApi client</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">If you experience database connection errors:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Verify the PHP API server is running</li>
              <li>Check the VITE_LAYONS_API_URL environment variable</li>
              <li>Ensure MySQL database is accessible</li>
              <li>Check browser console for specific error messages</li>
              <li>Verify network connectivity to the API endpoint</li>
            </ol>
          </div>

          <Alert className="border-blue-200 bg-blue-50">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-sm">
              The PHP API backend handles all database operations directly. No third-party authentication services are required.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
