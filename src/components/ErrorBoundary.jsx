import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[RIXX ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;
      return (
        <div style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          color: '#ede8df',
          fontFamily: 'Manrope, sans-serif',
          padding: '2rem',
          textAlign: 'center',
          gap: '1.2rem',
        }}>
          <span style={{ color: '#D4AF37', fontSize: '2rem' }}>◆</span>
          <h2 style={{ fontFamily: 'Noto Serif, serif', fontWeight: 300, fontSize: '1.5rem', margin: 0 }}>
            Algo salió mal
          </h2>
          <p style={{ color: '#6a6460', fontSize: '0.9rem', margin: 0, maxWidth: '36ch', lineHeight: 1.6 }}>
            Ocurrió un error inesperado. Podés recargar la página o volver al inicio.
          </p>
          {isDev && this.state.error && (
            <pre style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, padding: '1rem', fontSize: '11px', color: '#e05555', textAlign: 'left', maxWidth: '90vw', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '40vh' }}>
              {this.state.error.toString()}{'\n\n'}{this.state.error.stack}
            </pre>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              style={{ padding: '0.6rem 1.4rem', background: '#D4AF37', color: '#0a0a0a', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', fontFamily: 'Manrope, sans-serif' }}
            >
              Recargar
            </button>
            <a
              href="/"
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{ padding: '0.6rem 1.4rem', background: 'transparent', color: '#ede8df', border: '1px solid rgba(237,232,223,0.2)', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', textDecoration: 'none', fontFamily: 'Manrope, sans-serif', display: 'inline-flex', alignItems: 'center' }}
            >
              Ir al inicio
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
