import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import "./Auth.css";

type Mode = "login" | "register";

export default function Auth({ initial = "login" }: { initial?: Mode }) {
  const nav = useNavigate();
  const qc = useQueryClient();

  const [mode, setMode] = useState<Mode>(initial);

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");

  // Register form
  const [name, setName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  useEffect(() => setMode(initial), [initial]);

  const isRegister = mode === "register";

  async function finishAuth() {
    await qc.invalidateQueries({ queryKey: ["me"] });
    nav("/board");
  }

  async function onDemo() {
    if (loading) return;
    setErr(null);
    setLoading(true);
    try {
      await api.post("/auth/demo");
      await finishAuth();
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Demo login failed");
    } finally {
      setLoading(false);
    }
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setErr(null);
    setLoading(true);
    try {
      await api.post("/auth/login", { email: loginEmail, password: loginPass });
      await finishAuth();
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setErr(null);
    setLoading(true);
    try {
      await api.post("/auth/register", {
        email: regEmail,
        password: regPass,
        name: name || undefined,
      });
      await finishAuth();
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="authPage">
      <div className={`authCard ${isRegister ? "isRegister" : ""}`}>
        {/* LEFT: Sign in */}
        <div className="authPane authPaneLeft">
          <div className="authPaneInner">
            <div className="authHeader">
              <h2 className="authTitle">Sign in</h2>
              <p className="authSub">Use your account to access your board.</p>
            </div>

            <form className="authForm" onSubmit={onLogin}>
              <input
                className="authInput"
                placeholder="Email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                autoComplete="email"
              />

              <div className="authPasswordWrap">
                <input
                  className="authInput authInputWithToggle"
                  placeholder="Password"
                  type={showLoginPassword ? "text" : "password"}
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="authPasswordToggle"
                  onClick={() => setShowLoginPassword((v) => !v)}
                  aria-label={showLoginPassword ? "Hide password" : "Show password"}
                >
                  {showLoginPassword ? (
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path
                        fill="currentColor"
                        d="M2 2l20 20-1.5 1.5-3.1-3.1C15.7 21.1 13.9 21.5 12 21.5 7 21.5 2.7 18.4 1 13.5c.7-2 1.9-3.7 3.5-5l-2-2L2 2zm10 4c4.9 0 9 3 10.8 7.5-.6 1.6-1.5 3-2.7 4.2l-2.1-2.1c.6-.7 1-1.6 1-2.6 0-2.2-1.8-4-4-4-.9 0-1.7.3-2.4.8l-2-2c.8-.4 1.7-.8 2.6-.8z"
                      />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path
                        fill="currentColor"
                        d="M12 5c-5 0-9.3 3.1-11 7.5C2.7 16.9 7 20 12 20s9.3-3.1 11-7.5C21.3 8.1 17 5 12 5zm0 12c-2.5 0-4.5-2-4.5-4.5S9.5 8 12 8s4.5 2 4.5 4.5S14.5 17 12 17zm0-7c-1.4 0-2.5 1.1-2.5 2.5S10.6 15 12 15s2.5-1.1 2.5-2.5S13.4 10 12 10z"
                      />
                    </svg>
                  )}
                </button>
              </div>

              {/* Forgot password BELOW password */}
              <div className="authMetaRow">
                <Link className="authLink" to="/forgot-password">
                  Forgot password?
                </Link>
              </div>

              {err && <div className="authError">{err}</div>}

              <button className="authBtn primary" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </button>

              <button type="button" className="authBtn ghost" onClick={onDemo} disabled={loading}>
                Try Demo
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT: Sign up */}
        <div className="authPane authPaneRight">
          <div className="authPaneInner">
            <div className="authHeader">
              <h2 className="authTitle">Create account</h2>
              <p className="authSub">Track applications across stages with analytics + AI.</p>
            </div>

            <form className="authForm" onSubmit={onRegister}>
              <input
                className="authInput"
                placeholder="Name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
              <input
                className="authInput"
                placeholder="Email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                autoComplete="email"
              />
              <div className="authPasswordWrap">
                <input
                  className="authInput authInputWithToggle"
                  placeholder="Password (min 8 chars)"
                  type={showRegisterPassword ? "text" : "password"}
                  value={regPass}
                  onChange={(e) => setRegPass(e.target.value)}
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  className="authPasswordToggle"
                  onClick={() => setShowLoginPassword((v) => !v)}
                  aria-label={showLoginPassword ? "Hide password" : "Show password"}
                >
                  {showLoginPassword ? (
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path
                        fill="currentColor"
                        d="M2 2l20 20-1.5 1.5-3.1-3.1C15.7 21.1 13.9 21.5 12 21.5 7 21.5 2.7 18.4 1 13.5c.7-2 1.9-3.7 3.5-5l-2-2L2 2zm10 4c4.9 0 9 3 10.8 7.5-.6 1.6-1.5 3-2.7 4.2l-2.1-2.1c.6-.7 1-1.6 1-2.6 0-2.2-1.8-4-4-4-.9 0-1.7.3-2.4.8l-2-2c.8-.4 1.7-.8 2.6-.8z"
                      />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path
                        fill="currentColor"
                        d="M12 5c-5 0-9.3 3.1-11 7.5C2.7 16.9 7 20 12 20s9.3-3.1 11-7.5C21.3 8.1 17 5 12 5zm0 12c-2.5 0-4.5-2-4.5-4.5S9.5 8 12 8s4.5 2 4.5 4.5S14.5 17 12 17zm0-7c-1.4 0-2.5 1.1-2.5 2.5S10.6 15 12 15s2.5-1.1 2.5-2.5S13.4 10 12 10z"
                      />
                    </svg>
                  )}
                </button>
              </div>

              {err && <div className="authError">{err}</div>}

              <button className="authBtn primary" disabled={loading}>
                {loading ? "Creating..." : "Sign up"}
              </button>
            </form>
          </div>
        </div>

        {/* SLIDING OVERLAY */}
        <div className="authOverlay">
          {/* Visible on REGISTER (when overlay is on the LEFT) */}
          <div className="authOverlayPanel authOverlayPanelLeft">
            <h3 className="overlayTitle">Welcome Back!</h3>
            <p className="overlaySub">Log in to continue where you left off.</p>

            <button
              type="button"
              className="authBtn overlay"
              onClick={() => {
                setErr(null);
                setMode("login");
              }}
              disabled={loading}
            >
              Sign in
            </button>
          </div>

          {/* Visible on LOGIN (default on RIGHT) */}
          <div className="authOverlayPanel authOverlayPanelRight">
            <h3 className="overlayTitle">Hello, Friend!</h3>
            <p className="overlaySub">Enter your personal details and start your journey with us.</p>

            <button
              type="button"
              className="authBtn overlay"
              onClick={() => {
                setErr(null);
                setMode("register");
              }}
              disabled={loading}
            >
              Sign up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}