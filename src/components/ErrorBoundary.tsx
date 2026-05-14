/**
 * ErrorBoundary - Production-grade error handling
 *
 * Features:
 * - Graceful error UI with recovery options
 * - Error logging to telemetry
 * - Fallback UI that matches design system
 * - Configurable error granularity
 *
 * Usage:
 * <ErrorBoundary fallback={<CustomFallback />}>
 *   <YourComponent />
 * </ErrorBoundary>
 */

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { trackError } from '@/lib/telemetry';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  level?: 'page' | 'section' | 'component';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorCount: number;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log to telemetry
    trackError(error, {
      context: 'error_boundary',
      componentStack: errorInfo.componentStack,
      level: this.props.level || 'component',
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary] Caught error:', error);
      console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    }

    this.setState((prev) => ({
      errorInfo,
      errorCount: prev.errorCount + 1,
    }));

    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset error state if resetKeys change
    if (this.state.hasError && this.props.resetKeys) {
      const hasResetKeyChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );

      if (hasResetKeyChanged) {
        this.reset();
      }
    }
  }

  reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback based on level
      return (
        <DefaultErrorFallback
          error={this.state.error}
          errorCount={this.state.errorCount}
          level={this.props.level || 'component'}
          onReset={this.reset}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default error fallback UI
 */
function DefaultErrorFallback({
  error,
  errorCount,
  level,
  onReset,
}: {
  error: Error | null;
  errorCount: number;
  level: 'page' | 'section' | 'component';
  onReset: () => void;
}) {
  // Page-level error (full page)
  if (level === 'page') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-lg border border-slate-200 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-100">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
          </div>

          <h2 className="text-xl font-semibold text-slate-900 mb-2">Er ging iets mis</h2>
          <p className="text-sm text-slate-600 mb-6">
            {errorCount > 2
              ? 'Deze pagina blijft crashen. Probeer de pagina te verversen.'
              : 'We konden deze pagina niet laden. Probeer het opnieuw.'}
          </p>

          {process.env.NODE_ENV === 'development' && error && (
            <div className="mb-6 p-3 bg-slate-50 rounded-lg text-left">
              <p className="text-xs font-mono text-red-600 break-words">{error.message}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onReset}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors duration-200"
            >
              <RefreshCw className="w-4 h-4" />
              Opnieuw proberen
            </button>

            {errorCount > 2 && (
              <button
                onClick={() => (window.location.href = '/')}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors duration-200"
              >
                <Home className="w-4 h-4" />
                Home
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Section-level error (card/section)
  if (level === 'section') {
    return (
      <div className="p-6 bg-white rounded-lg border border-slate-200">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Sectie niet beschikbaar</h3>
            <p className="text-xs text-slate-600 mb-3">
              Deze sectie kon niet worden geladen.
            </p>

            {process.env.NODE_ENV === 'development' && error && (
              <div className="mb-3 p-2 bg-slate-50 rounded text-[10px] font-mono text-red-600 break-words">
                {error.message}
              </div>
            )}

            <button
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors duration-200"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Opnieuw laden
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Component-level error (inline)
  return (
    <div className="p-4 bg-amber-50/50 rounded-lg border border-amber-200/50">
      <div className="flex items-center gap-2 text-amber-800">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span className="text-xs">
          {errorCount > 2 ? 'Component blijft crashen' : 'Kon niet worden geladen'}
        </span>
        {errorCount <= 2 && (
          <button
            onClick={onReset}
            className="ml-auto text-xs font-medium hover:underline"
          >
            Opnieuw
          </button>
        )}
      </div>

      {process.env.NODE_ENV === 'development' && error && (
        <div className="mt-2 text-[10px] font-mono text-red-600 break-words">
          {error.message}
        </div>
      )}
    </div>
  );
}

/**
 * Hook for imperative error boundaries
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return setError;
}
