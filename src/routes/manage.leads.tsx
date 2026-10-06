import { createFileRoute, useRouter } from "@tanstack/react-router";

import { shortDate } from "@/components/site/portal-bits";
import { listConsultations, updateConsultation } from "@/lib/api/admin.functions";

export const Route = createFileRoute("/manage/leads")({
  loader: () => listConsultations(),
  component: Leads,
});

const STATUSES = ["new", "contacted", "booked", "closed"] as const;

function Leads() {
  const rows = Route.useLoaderData();
  const router = useRouter();
  return (
    <>
      <div className="mb-main__head">
        <div>
          <p className="mb-eyebrow" style={{ marginBottom: "0.3rem" }}>Leads</p>
          <h1 className="mb-h2">Consultation requests</h1>
        </div>
      </div>
      <section className="mb-panel">
        {rows.length ? (
          <table className="mb-table">
            <thead><tr><th>Received</th><th>Name</th><th>Contact</th><th>Room</th><th>Project</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{shortDate(r.created_at)}</td>
                  <td>{r.name}<div className="mb-note">{r.zip}</div></td>
                  <td><a href={`mailto:${r.email}`}>{r.email}</a>{r.phone ? <div className="mb-note"><a href={`tel:${r.phone}`}>{r.phone}</a></div> : null}</td>
                  <td>{r.room}</td>
                  <td style={{ maxWidth: "22rem", whiteSpace: "pre-line" }}>{r.message}</td>
                  <td>
                    <select
                      className="mb-input"
                      style={{ padding: "0.4rem 0.5rem", width: "auto" }}
                      value={r.status}
                      aria-label={`Status for ${r.name}`}
                      onChange={async (e) => {
                        await updateConsultation({ data: { id: r.id, status: e.target.value as (typeof STATUSES)[number] } });
                        await router.invalidate();
                      }}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mb-muted">No requests yet. They arrive from the consultation form on the home page.</p>
        )}
      </section>
    </>
  );
}
