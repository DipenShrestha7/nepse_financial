import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiMessageSquare, FiGitMerge, FiHome } from "react-icons/fi";
import AuthOverlay from "./AuthOverlay";
import { getCurrentUser, logoutUser } from "../../utils/auth";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authOpen, setAuthOpen] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const syncUser = () => {
      const user = getCurrentUser();
      setUsername(user?.username || null);
    };

    const openOverlay = () => setAuthOpen(true);

    syncUser();
    window.addEventListener("auth-changed", syncUser);
    window.addEventListener("open-auth-overlay", openOverlay);

    return () => {
      window.removeEventListener("auth-changed", syncUser);
      window.removeEventListener("open-auth-overlay", openOverlay);
    };
  }, []);

  const isActive = (path: string) => {
    const cur = location.pathname || "/";
    if (path === "/") return cur === "/" || cur === "/company";
    return cur.startsWith(path);
  };

  return (
    <>
      <header className="panel site-header">
        <div onClick={() => navigate("/company")} className="site-brand">
          <div className="site-logo">M</div>
          <div className="site-brand-text">
            <div className="site-brand-name">Mero Market</div>
          </div>
        </div>

        <div className="site-nav">
          <button
            onClick={() => navigate("/company")}
            className={`btn-ghost cursor-pointer ${isActive("/company") ? "active" : ""}`}
            aria-current={isActive("/company") ? "page" : undefined}
          >
            <FiHome className="inline mr-1 mb-0.5" />
            Home
          </button>
          <button
            onClick={() => navigate("/comparison")}
            className={`btn-ghost cursor-pointer ${isActive("/comparison") ? "active" : ""}`}
            aria-current={isActive("/comparison") ? "page" : undefined}
          >
            <FiGitMerge className="inline mr-1 mb-0.5" />
            Compare
          </button>
          <button
            onClick={() => navigate("/chatbot")}
            className={`btn-ghost cursor-pointer ${isActive("/chatbot") ? "active" : ""}`}
            aria-current={isActive("/chatbot") ? "page" : undefined}
          >
            <FiMessageSquare className="inline mr-1" />
            Chatbot
          </button>

          {username ? (
            <button
              onClick={logoutUser}
              className="btn-secondary cursor-pointer"
              title={`Logged in as ${username}`}
            >
              Logout ({username})
            </button>
          ) : (
            <button
              onClick={() => setAuthOpen(true)}
              className="btn-primary cursor-pointer"
            >
              Login
            </button>
          )}
        </div>
      </header>

      <AuthOverlay open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
