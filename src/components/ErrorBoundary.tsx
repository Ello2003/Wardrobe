import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  isModal?: boolean;
  onClose?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onClose) {
      this.props.onClose();
    }
  };

  public handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.isModal) {
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="max-w-md w-full bg-white border border-[#E5E5E1] p-6 shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-serif font-bold text-[#1A1A1A]">
                  {this.props.fallbackTitle || 'Could not display editor'}
                </h2>
                <p className="text-xs text-[#767670] mt-1 font-mono">
                  {this.state.error?.message || 'An error occurred while loading this item.'}
                </p>
              </div>
              <div className="pt-3 border-t border-[#E5E5E1] flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="px-4 py-2 text-xs font-mono font-medium border border-[#D5D5D0] text-[#1A1A1A] hover:bg-[#F2F1ED] cursor-pointer"
                >
                  Close &amp; Recover
                </button>
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="px-4 py-2 text-xs font-mono font-medium bg-[#8C7355] text-white hover:bg-[#735D43] flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reload App
                </button>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-[200px] flex items-center justify-center p-6 bg-[#F8F7F4] text-[#1A1A1A]">
          <div className="max-w-md w-full bg-white border border-[#E5E5E1] p-6 shadow-xl rounded-none text-center space-y-4">
            <div className="w-12 h-12 bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-[#1A1A1A]">
                {this.props.fallbackTitle || 'Something interrupted the display'}
              </h2>
              <p className="text-xs text-[#767670] mt-1 font-mono">
                {this.state.error?.message || 'An unexpected rendering issue occurred.'}
              </p>
            </div>
            <div className="pt-3 border-t border-[#E5E5E1] flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 text-xs font-mono font-medium border border-[#D5D5D0] text-[#1A1A1A] hover:bg-[#F2F1ED] cursor-pointer"
              >
                Try to Recover
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2 text-xs font-mono font-medium bg-[#8C7355] text-white hover:bg-[#735D43] flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
