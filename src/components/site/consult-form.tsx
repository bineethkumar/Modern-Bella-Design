import { useState, type FormEvent } from "react";

import { requestConsultation } from "@/lib/api/store.functions";

export function ConsultForm() {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState("busy");
    setError(null);
    try {
      await requestConsultation({
        data: {
          name: String(f.get("name") ?? ""),
          email: String(f.get("email") ?? ""),
          phone: String(f.get("phone") ?? ""),
          zip: String(f.get("zip") ?? ""),
          room: String(f.get("room") ?? ""),
          message: String(f.get("message") ?? ""),
        },
      });
      setState("done");
    } catch {
      setError("Please check your name and email, then try again.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="mb-on-ink" role="status">
        <p className="mb-h3" style={{ color: "var(--mb-cream)" }}>Thank you. We will be in touch within one business day.</p>
        <p className="mb-success" style={{ marginTop: "1rem" }}>Your request is in our studio queue.</p>
      </div>
    );
  }

  return (
    <form className="mb-form mb-on-ink" onSubmit={onSubmit}>
      <label className="mb-field">
        <span>Name</span>
        <input name="name" required autoComplete="name" />
      </label>
      <label className="mb-field">
        <span>Email</span>
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label className="mb-field">
        <span>Phone</span>
        <input name="phone" type="tel" autoComplete="tel" />
      </label>
      <label className="mb-field">
        <span>ZIP code</span>
        <input name="zip" inputMode="numeric" autoComplete="postal-code" />
      </label>
      <label className="mb-field mb-span">
        <span>The room</span>
        <select name="room" defaultValue="Kitchen">
          <option>Kitchen</option>
          <option>Bathroom</option>
          <option>Kitchen and bath</option>
          <option>Basement</option>
          <option>Whole home</option>
        </select>
      </label>
      <label className="mb-field mb-span">
        <span>Tell us about the project</span>
        <textarea name="message" placeholder="Size of the room, timing, finishes you like" />
      </label>
      <div className="mb-span" style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
        <button type="submit" className="cta-gild" disabled={state === "busy"}>
          {state === "busy" ? "Sending" : "Request my consultation"}
        </button>
        {error ? <p className="mb-error">{error}</p> : null}
      </div>
    </form>
  );
}
