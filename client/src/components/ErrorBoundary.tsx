import React from 'react';

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen bg-kaizen-bg flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-4">
          <h1 className="text-xl font-semibold text-white">Something went wrong</h1>
          <p className="text-sm text-kaizen-muted">
            An unexpected error occurred. Your data is safe. Reloading usually fixes it.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-control bg-emerald-500 hover:bg-emerald-400 text-[#0B0D13] font-semibold text-sm"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
