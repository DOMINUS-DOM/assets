'use client';

import { Component, ReactNode } from 'react';

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

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6 text-center">
          <span className="text-5xl mb-4">🍟</span>
          <h1 className="text-xl font-bold text-white mb-2">Oops !</h1>
          <p className="text-zinc-400 text-sm mb-6">
            Une erreur est survenue. Rechargez la page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm active:scale-95 transition-transform"
          >
            Recharger
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
