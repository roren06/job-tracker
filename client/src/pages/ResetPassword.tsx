import { useMemo, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import "./Auth.css";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const token = useMemo(() => params.get("token") ?? "", [params]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setDone(null);

    if (!token) {
      setErr("Invalid or missing reset token.");
      return;
    }

    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setErr("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/auth/reset-password", {
        token,
        password,
      });

      setDone(res.data?.message || "Password has been reset successfully.");

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1800);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="authPage authPageForgot">
      <div className="authBg" />

      <div className="authCard authCard--single">
        <div className="authHeader">
          <h1 className="authTitle">Set new password</h1>
          <p className="authSub">
            Enter your new password to finish resetting your account.
          </p>
        </div>

        <form className="authForm authForm--single" onSubmit={onSubmit}>
          <div className="authFieldBlock">
            <div className="authLabel">New password</div>
            <input
              className="authInput"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className="authFieldBlock">
            <div className="authLabel">Confirm password</div>
            <input
              className="authInput"
              type="password"
              placeholder="Re-enter password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          {err ? <div className="authNotice authNotice--error">{err}</div> : null}
          {done ? <div className="authNotice authNotice--success">{done}</div> : null}

          <div className="authActions">
            <button className="authBtn authBtn--primary" disabled={loading}>
              {loading ? "Saving..." : "Reset password"}
            </button>

            <Link className="authBtn authBtn--ghost" to="/login">
              Back to login
            </Link>
          </div>

          <div className="authFootNote">
            Use a strong password you haven’t used before.
          </div>
        </form>
      </div>
    </div>
  );
}