import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Protected route crashed:", error, errorInfo);
  }

  handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.assign("/login");
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-2xl rounded-[40px] border border-white/10 bg-white/5 backdrop-blur-xl p-8 md:p-10 shadow-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-500/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.24em] text-red-200">
              <span className="size-2 rounded-full bg-red-400" />
              Application Error
            </div>

            <div className="mt-6 space-y-4">
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
                This screen failed to load.
              </h1>
              <p className="text-sm md:text-base text-slate-300 leading-relaxed">
                SwiftPharma prevented a blank screen and captured the runtime
                error below.
              </p>
            </div>

            <div className="mt-8 rounded-[28px] border border-white/10 bg-slate-950/70 p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                Error Message
              </p>
              <pre className="mt-3 whitespace-pre-wrap break-words text-sm text-red-200 font-medium">
                {this.state.error?.message || "An unexpected error occurred."}
              </pre>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={this.handleGoBack}
                className="rounded-2xl bg-primary px-6 py-3 text-sm font-black uppercase tracking-widest text-white transition-transform hover:scale-[1.02]"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
