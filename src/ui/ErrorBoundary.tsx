import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode; onReset: () => void; message?: string; buttonLabel?: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error('UI error', error);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--kit-parchment, #ece3c8)', color: 'var(--kit-ink, #221c16)', fontFamily: 'EB Garamond, serif' }}>
        <div style={{ maxWidth: 520, textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'IM Fell English SC', serif", fontWeight: 400, color: 'var(--kit-crimson, #a3262a)' }}>The messenger stumbled</h2>
          <p>{this.props.message ?? 'Something went wrong while drawing the battle. Your game is saved; you can return to the menu and continue it.'}</p>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: 'var(--kit-ink-soft, #594a39)' }}>{this.state.error.message}</pre>
          <button
            style={{ marginTop: 12, padding: '8px 18px', fontFamily: "'IM Fell English SC', serif", background: 'var(--kit-crimson, #a3262a)', color: 'var(--kit-parchment-light, #f6f0de)', border: '1px solid #4a1214', borderRadius: 2, cursor: 'pointer' }}
            onClick={() => {
              this.setState({ error: null });
              this.props.onReset();
            }}
          >
            {this.props.buttonLabel ?? 'Return to menu'}
          </button>
        </div>
      </div>
    );
  }
}
