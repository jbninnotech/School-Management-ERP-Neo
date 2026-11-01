import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ExamErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CRITICAL: ExamErrorBoundary caught an unhandled rendering error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="d-flex align-items-center justify-content-center vh-100 bg-light p-4">
          <div className="card border-0 shadow-lg rounded-4 p-4 p-md-5 text-center" style={{ maxWidth: '580px', width: '100%' }}>
            <div className="mb-3">
              <AlertTriangle size={56} className="text-danger mx-auto" />
            </div>
            <h4 className="fw-bold text-dark mb-2">Something went wrong in your examination session</h4>
            <p className="text-muted small mb-3">
              An unexpected error occurred while displaying this question. Your timer and submitted answers remain safe on the server.
            </p>

            {this.state.error?.message && (
              <div className="alert alert-danger text-start small mb-4 font-monospace p-2" style={{ fontSize: '0.8rem', maxHeight: '120px', overflowY: 'auto' }}>
                {this.state.error.message}
              </div>
            )}

            <div className="d-flex flex-column flex-sm-row justify-content-center gap-2">
              <button
                type="button"
                className="btn btn-primary d-flex align-items-center justify-content-center gap-2 px-4 py-2 fw-semibold rounded-3"
                onClick={this.handleRetry}
              >
                <RefreshCw size={16} /> Click to Retry
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary px-4 py-2 rounded-3"
                onClick={() => window.location.href = '/exams'}
              >
                Return to Exam Hub
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
