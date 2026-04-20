'use client';

import { Component, ReactNode } from 'react';
import { captureException } from '@/lib/sentry';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    captureException(error, { component: 'ErrorBoundary' });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#F5F3EF' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #108eff, #9f32fd, #fe646c)', marginBottom: 20, opacity: 0.6 }} />
          <h1 className="text-xl font-bold mb-2" style={{ color: '#1A1A1A' }}>Une erreur est survenue</h1>
          <p className="text-sm mb-6" style={{ color: '#8A8A8A' }}>
            Rechargez la page pour continuer.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-xl font-semibold text-sm active:scale-95 transition-transform"
            style={{ background: '#1A1A1A', color: '#fff' }}
          >
            Recharger
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
