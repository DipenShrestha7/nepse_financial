import { FiX } from "react-icons/fi";

type LogoutConfirmationOverlayProps = {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  username: string | null;
};

export default function LogoutConfirmationOverlay({
  open,
  onConfirm,
  onCancel,
  username,
}: LogoutConfirmationOverlayProps) {
  if (!open) return null;

  return (
    <div className="auth-overlay" role="dialog" aria-modal="true">
      <button
        type="button"
        className="auth-backdrop"
        aria-label="Close confirmation dialog"
        onClick={onCancel}
      />

      <section className="auth-dialog panel" style={{ maxWidth: "400px" }}>
        <div className="auth-head">
          <div>
            <h2>Confirm Logout</h2>
            <p>Are you sure you want to log out?</p>
          </div>
          <button type="button" className="auth-close" onClick={onCancel}>
            <FiX />
          </button>
        </div>

        <div style={{ padding: "1.5rem 1rem" }}>
          <p style={{ marginBottom: "1.5rem", textAlign: "center" }}>
            {username ? `You are currently logged in as ${username}.` : ""}
          </p>

          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onCancel}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={onConfirm}
              style={{ flex: 1 }}
            >
              Logout
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
