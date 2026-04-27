/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useReducer,
} from "react";
import styles from "../styles/Toast.module.scss";

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_TOASTS = 4;
const DURATION_MS = 3000;

// ─── Reducer ──────────────────────────────────────────────────────────────────
function toastReducer(state, action) {
  switch (action.type) {
    case "ADD": {
      // LIFO: new toast at the beginning; cap at MAX_TOASTS
      const next = [action.payload, ...state].slice(0, MAX_TOASTS);
      return next;
    }
    case "REMOVE":
      return state.filter((t) => t.id !== action.id);
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
const ToastContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ToastProvider({ children }) {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  const remove = useCallback((id) => {
    dispatch({ type: "REMOVE", id });
  }, []);

  const add = useCallback(
    (type, message) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      dispatch({ type: "ADD", payload: { id, type, message } });
      setTimeout(() => remove(id), DURATION_MS);
    },
    [remove]
  );

  const toast = {
    success: (message) => add("success", message),
    error: (message) => add("error", message),
    info: (message) => add("info", message),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}

// ─── ToastContainer ───────────────────────────────────────────────────────────
function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null;

  return (
    <div className={styles.container} role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

// ─── ToastItem ────────────────────────────────────────────────────────────────
function ToastItem({ toast, onRemove }) {
  return (
    <div
      className={`${styles.toast} ${styles[toast.type]}`}
      role="alert"
      aria-atomic="true"
    >
      <span className={styles.message}>{toast.message}</span>
      <button
        className={styles.close}
        onClick={() => onRemove(toast.id)}
        aria-label="Cerrar notificación"
      >
        ×
      </button>
    </div>
  );
}
