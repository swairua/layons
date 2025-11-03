// API Health Check - Diagnoses connectivity issues with the Layons API

export interface ApiHealthStatus {
  online: boolean;
  apiUrl: string;
  responseTime: number;
  statusCode?: number;
  error?: string;
  timestamp: Date;
}

export async function checkApiHealth(): Promise<ApiHealthStatus> {
  const apiUrl = (import.meta as any)?.env?.VITE_LAYONS_API_URL || 'https://erp.layonsconstruction.com/api.php';
  const startTime = Date.now();

  try {
    // Try a simple request to check if API is responding
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for health check

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    return {
      online: response.ok,
      apiUrl,
      responseTime,
      statusCode: response.status,
      timestamp: new Date(),
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    return {
      online: false,
      apiUrl,
      responseTime,
      error: errorMsg,
      timestamp: new Date(),
    };
  }
}

export function logApiHealthStatus(status: ApiHealthStatus): void {
  console.log('[API Health Check]', {
    online: status.online ? '✓ Online' : '✗ Offline',
    url: status.apiUrl,
    responseTime: `${status.responseTime}ms`,
    statusCode: status.statusCode || 'N/A',
    error: status.error || 'None',
  });
}
