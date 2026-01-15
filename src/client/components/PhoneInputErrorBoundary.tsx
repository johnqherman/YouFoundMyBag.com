import React, { Component } from 'react';
import type {
  PhoneInputErrorBoundaryProps,
  PhoneInputErrorBoundaryState,
} from '../types/index.js';

export class PhoneInputErrorBoundary extends Component<
  PhoneInputErrorBoundaryProps,
  PhoneInputErrorBoundaryState
> {
  constructor(props: PhoneInputErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): PhoneInputErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('PhoneInputErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="phone-input-fallback">
            <input
              type="tel"
              placeholder="Phone number"
              className="input-field mb-3 border-yellow-500"
              title="Phone input temporarily unavailable - using basic fallback"
            />
            <p className="text-yellow-400 text-xs mb-2">
              Phone input temporarily unavailable. Basic input provided.
            </p>
          </div>
        )
      );
    }

    return this.props.children;
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: undefined });
  };
}

export default PhoneInputErrorBoundary;
