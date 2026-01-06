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
                           this.state.error?.message?.includes('Network') ||
                           this.state.error?.stack?.includes('chrome-extension://');

      const isCriticalAuthError = this.state.error?.message?.includes('Invalid Refresh Token') ||
                                  this.state.error?.message?.includes('invalid_token') ||
                                  this.state.error?.message?.includes('Auth session');

      // For network errors, provide recovery options but don't block completely
      if (isNetworkError && !isCriticalAuthError) {
        return (
          <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <div className="w-full max-w-2xl space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    Connection Issue Detected
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-900">
                      <strong>Temporary connection problem:</strong> The app is having trouble reaching the server.
                      This is usually temporary and should resolve itself.
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-blue-200 bg-blue-50">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-900">
                      <strong>What you can try:</strong>
                      <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                        <li>Wait a moment and try again</li>
                        <li>Check your internet connection</li>
                        <li>Try disabling browser extensions temporarily</li>
                        <li>Use an incognito/private browsing window</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-2">
                    <Button onClick={this.handleRetry} className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Try Again
                    </Button>
                    <Button
                      variant="outline"
                      onClick={this.toggleDiagnostics}
                      className="text-xs"
                    >
                      {this.state.showDiagnostics ? 'Hide' : 'Show'} Details
                    </Button>
                  </div>

                  {this.state.showDiagnostics && (
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer hover:text-foreground font-medium">
                        Technical Information
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                        {this.state.error?.message}
                      </pre>
                    </details>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        );
      }

      // For critical auth errors
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
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-900">
                    <strong>Authentication Problem:</strong> {this.state.error?.message || 'An authentication issue occurred'}
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Button onClick={this.handleRetry} className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </Button>
                </div>

                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer hover:text-foreground">
                    Technical Details
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
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
