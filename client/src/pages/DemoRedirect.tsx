import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { startDemoLogin } from "../lib/demoLogin";

export default function DemoRedirect() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await startDemoLogin(qc, navigate);
      } catch (e: unknown) {
        if (cancelled) return;
        const msg =
          (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Demo login failed";
        setErr(msg);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, qc]);

  if (err) {
    return (
      <div className="appBoot">
        <div className="appBootCard">
          <div className="appBootTitle">Could not start demo</div>
          <div className="appBootSub">{err}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="appBoot">
      <div className="appBootCard">
        <div className="appBootSpinner" />
        <div className="appBootTitle">Starting demo...</div>
        <div className="appBootSub">Loading sample applications</div>
      </div>
    </div>
  );
}
