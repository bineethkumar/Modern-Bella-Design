import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";

import { adminSignOut, getAdmin } from "@/lib/api/admin.functions";

/** Portal shell. Every page under /manage requires a management session. */
export const Route = createFileRoute("/manage")({
  beforeLoad: async () => {
    const { admin } = await getAdmin();
    if (!admin) throw redirect({ to: "/staff-login" });
    return { admin };
  },
  head: () => ({ meta: [{ title: "Studio portal | Modern Bella Design" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: Portal,
});

function Portal() {
  const { admin } = Route.useRouteContext();
  const navigate = useNavigate();
  return (
    <div className="mb-portal">
      <aside className="mb-side">
        <Link to="/manage"><img src="/assets/brand/logo-light@sm.png" alt="Modern Bella Design" width={800} height={247} /></Link>
        <nav aria-label="Portal">
          <Link to="/manage" activeOptions={{ exact: true }}>Dashboard</Link>
          <Link to="/manage/orders">Orders &amp; tracking</Link>
          <Link to="/manage/invoices">Invoices</Link>
          <Link to="/manage/leads">Consultations</Link>
          <Link to="/" target="_blank">View store</Link>
        </nav>
        <div className="mb-side__foot">
          <span>{admin.email}</span>
          <button
            type="button"
            onClick={async () => {
              await adminSignOut();
              await navigate({ to: "/staff-login" });
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <div className="mb-main">
        <Outlet />
      </div>
    </div>
  );
}
