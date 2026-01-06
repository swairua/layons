import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Shield } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  showDiagnostics: boolean;
}

export class AuthErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 2;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, showDiagnostics: false };
  }

  // Normalize any thrown value into an Error instance so UI can reliably read .message/.stack
  static getDerivedStateFromError(error: unknown): State {
    let normalizedError: Error;

    if (error instanceof Error) {
      normalizedError = error;
    } else {
      try {
        normalizedError = new Error(
          typeof error === 'string' ? error : JSON.stringify(error, null, 2)
        );
      } catch {
        normalizedError = new Error(String(error));
      }
    }

    return { hasError: true, error: normalizedError, showDiagnostics: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Only log critical auth errors, not transient network issues
    const errorMsg = error?.message || '';
    const isCriticalError =
      errorMsg.includes('Invalid Refresh Token') ||
      errorMsg.includes('invalid_token') ||
      errorMsg.includes('Auth session') ||
      errorMsg.includes('auth');

    if (isCriticalError) {
      console.error('Auth error boundary caught critical error:', error, errorInfo);
    } else {
      console.warn('Auth error boundary caught error (may be transient):', errorMsg);
    }
  }

  handleRetry = () => {
    this.retryCount++;

    if (this.retryCount > this.maxRetries) {
      // After max retries, hard reload
      window.location.href = window.location.href;
      return;
    }

    // Just clear error state and let the app continue
    this.setState({ hasError: false, error: undefined, showDiagnostics: false });

    // If it's a network error, don't force reload - let app continue
    const errorMsg = this.state.error?.message || '';
    if (!errorMsg.includes('Failed to fetch') && !errorMsg.includes('Network')) {
      // For non-network errors, reload after a short delay
      setTimeout(() => window.location.reload(), 500);
    }
  };

  toggleDiagnostics = () => {
    this.setState(prev => ({ showDiagnostics: !prev.showDiagnostics }));
  };

  render() {
    if (this.state.hasError) {
      const isNetworkError = this.state.error?.message?.includes('Failed to fetch') ||
                           this.state.error?.stack?.includes('chrome-extension://');

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <div className="w-full max-w-2xl space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Authentication Error
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {isNetworkError ? (
                      <>
                        <strong>Connection Issue Detected:</strong> This appears to be a network connectivity 
                        problem, possibly caused by a browser extension or network policy blocking the request.
                      </>
                    ) : (
                      <>
                        <strong>System Error:</strong> {this.state.error?.message || 'An unexpected error occurred'}
                      </>
                    )}
                  </AlertDescription>
                </Alert>

                {isNetworkError && (
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Quick Fixes:</strong>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Try disabling browser extensions (especially ad blockers)</li>
                        <li>Use an incognito/private browsing window</li>
                        <li>Check if your company firewall is blocking the request</li>
                        <li>Ensure you have a stable internet connection</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button onClick={this.handleRetry} className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={this.toggleDiagnostics}
                  >
                    {this.state.showDiagnostics ? 'Hide' : 'Show'} Diagnostics
                  </Button>
                </div>

                {this.state.showDiagnostics && (
                  <div className="mt-4">
                    <div className="text-sm text-muted-foreground">
                      Network diagnostics temporarily disabled.
                    </div>
                  </div>
                )}

                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer hover:text-foreground">
                    Technical Details
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                    {this.state.error?.stack || this.state.error?.message}
                  </pre>
                </details>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
