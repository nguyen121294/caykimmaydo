'use client';
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-red-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-red-100 rounded-full p-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="text-sm font-semibold text-gray-700">
              {this.props.fallbackTitle || 'Không thể hiển thị module này'}
            </h3>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            {this.state.error?.message || 'Đã xảy ra lỗi không mong muốn.'}
          </p>
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Thử lại
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
