import { useEffect, useState, type FormEvent } from "react";
import { FiEye, FiEyeOff, FiLock, FiMail, FiUser, FiX } from "react-icons/fi";
import { loginUser, signupUser } from "../../utils/authApi";

type Mode = "login" | "signup";

type AuthOverlayProps = {
  open: boolean;
  onClose: () => void;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthOverlay({ open, onClose }: AuthOverlayProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [userIdOrEmail, setUserIdOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", onEscape);
    };
  }, [open, onClose]);

  useEffect(() => {
    setError("");
  }, [mode]);

  if (!open) return null;

  const resetForm = () => {
    setUsername("");
    setEmail("");
    setUserIdOrEmail("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setError("");
  };

  const closeOverlay = () => {
    resetForm();
    onClose();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password.trim().length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (mode === "signup") {
      if (!username.trim()) {
        setError("Username is required.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Password and confirm password do not match.");
        return;
      }

      if (!EMAIL_RE.test(email.trim())) {
        setError("Please enter a valid email address.");
        return;
      }

      const result = await signupUser({
        username: username.trim(),
        email: email.trim(),
        password,
      });

      if (result.ok==false) {
        setError(result.error);
        return;
      }

      closeOverlay();
      return;
    }

    if (!userIdOrEmail.trim()) {
      setError("Email is required.");
      return;
    }

    const result = await loginUser({
      userIdOrEmail: userIdOrEmail.trim(),
      password,
    });
    if (result.ok==false) {
      setError(result.error);
      return;
    }

    closeOverlay();
  };

  return (
    <div className="auth-overlay" role="dialog" aria-modal="true">
      <button
        type="button"
        className="auth-backdrop"
        aria-label="Close login dialog"
        onClick={closeOverlay}
      />

      <section className="auth-dialog panel">
        <div className="auth-head">
          <div>
            <h2>
              {mode === "login"
                ? "Login to Mero Market"
                : "Create your account"}
            </h2>
            <p>
              {mode === "login"
                ? "Login is required only for chatbot sessions."
                : "Sign up once to save your personal chatbot sessions."}
            </p>
          </div>
          <button type="button" className="auth-close" onClick={closeOverlay}>
            <FiX />
          </button>
        </div>

        <div
          className="auth-tabs"
          role="tablist"
          aria-label="Auth mode selector"
        >
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === "signup" ? "active" : ""}
            onClick={() => setMode("signup")}
          >
            Sign Up
          </button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === "signup" && (
            <label>
              <span>Username</span>
              <div className="auth-input-wrap">
                <FiUser />
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Enter username"
                />
              </div>
            </label>
          )}

          <label>
            <span>{mode === "signup" ? "Email" : "Email"}</span>
            <div className="auth-input-wrap">
              <FiMail />
              <input
                type={mode === "signup" ? "email" : "text"}
                value={mode === "signup" ? email : userIdOrEmail}
                onChange={(event) =>
                  mode === "signup"
                    ? setEmail(event.target.value)
                    : setUserIdOrEmail(event.target.value)
                }
                placeholder={
                  mode === "signup" ? "name@example.com" : "name@example.com"
                }
              />
            </div>
          </label>

          <label>
            <span>Password</span>
            <div className="auth-input-wrap auth-password-wrap">
              <FiLock />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
              />
              <button
                type="button"
                className="auth-visibility"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </label>

          {mode === "signup" && (
            <label>
              <span>Confirm Password</span>
              <div className="auth-input-wrap auth-password-wrap">
                <FiLock />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repeat your password"
                />
                <button
                  type="button"
                  className="auth-visibility"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                >
                  {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </label>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn-primary auth-submit-btn">
            {mode === "login" ? "Login" : "Create Account"}
          </button>
        </form>
      </section>
    </div>
  );
}
