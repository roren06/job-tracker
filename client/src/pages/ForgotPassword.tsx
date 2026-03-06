import { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../lib/api";
import "./Auth.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setDone(null);
    setLoading(true);

    try {
      const data = await requestPasswordReset(email);
      setDone(data.message);
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
          <h1 className="authTitle">Reset password</h1>
          <p className="authSub">
            Enter your email. If it matches an account, we’ll send a reset link.
          </p>
        </div>

        <form className="authForm authForm--single" onSubmit={onSubmit}>
          <div className="authFieldBlock">
            <div className="authLabel">Email</div>
            <input
              className="authInput"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          {err ? <div className="authNotice authNotice--error">{err}</div> : null}
          {done ? <div className="authNotice authNotice--success">{done}</div> : null}

          <div className="authActions">
            <button className="authBtn authBtn--primary" disabled={loading}>
              {loading ? "Sending..." : "Send reset link"}
            </button>

            <Link className="authBtn authBtn--ghost" to="/login">
              Back to login
            </Link>
          </div>

          <div className="authFootNote">
            For security, we don’t confirm whether an email exists.
          </div>
        </form>
      </div>
    </div>
  );
}