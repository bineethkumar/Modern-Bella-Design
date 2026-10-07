import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { adminSignIn, getAdmin } from "@/lib/api/admin.functions";

export const Route = createFileRoute("/staff-login")({
  beforeLoad: async () => {
    const { admin } = await getAdmin();
    if (admin) throw redirect({ to: "/manage" });
  },
  loader: () => getAdmin(),
  head: () => ({ meta: [{ title: "Management login | Modern Bella Design" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: StaffLogin,
});

function StaffLogin() {
  const { configured } = Route.useLoaderData();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await adminSignIn({ data: { email: String(f.get("email") ?? ""), password: String(f.get("password") ?? "") } });
      await navigate({ to: "/manage" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
      setBusy(false);
    }
  }

  return (
    <main className="mb-login">
      <form className="mb-login__card" onSubmit={onSubmit}>
        <img src="/assets/brand/logo-ink@sm.png" alt="Modern Bella Design" width={800} height={247} />
        <hr className="mb-rule" />
        <div>
          <p className="mb-eyebrow" style={{ marginBottom: "0.3rem" }}>Management</p>
          <h1 className="mb-h3">Sign in to the studio portal</h1>
        </div>
        {!configured ? (
          <p className="mb-banner" style={{ margin: 0 }}>
            Login is not set up yet. Add ADMIN_EMAIL and ADMIN_PASSWORD as secrets in the website settings, then redeploy.
          </p>
        ) : null}
        <label className="mb-field"><span>Email</span><input name="email" type="email" required autoComplete="username" /></label>
        <label className="mb-field"><span>Password</span><input name="password" type="password" required autoComplete="current-password" /></label>
        {error ? <p className="mb-error" role="alert">{error}</p> : null}
        <button type="submit" className="cta-place" disabled={busy || !configured} data-busy={busy ? "true" : "false"}>
          {busy ? "Signing in" : "Sign in"}
        </button>
        <Link to="/" className="mb-linkbtn" style={{ justifySelf: "center" }}>Back to the store</Link>
      </form>
    </main>
  );
}
