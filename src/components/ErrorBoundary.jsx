import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught:", error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "60vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: "1rem",
          background: "#0a0a0a", color: "#888",
        }}>
          <p style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "1.5rem", color: "#D4AF37", fontStyle: "italic",
          }}>
            Algo salió mal
          </p>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase",
          }}>
            Recargá la página para continuar.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "1rem", padding: "0.75rem 2rem",
              border: "1px solid #D4AF37", background: "transparent",
              color: "#D4AF37", fontFamily: "'DM Sans', sans-serif",
              fontSize: "11px", letterSpacing: "0.3em",
              textTransform: "uppercase", cursor: "pointer",
            }}
          >
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
