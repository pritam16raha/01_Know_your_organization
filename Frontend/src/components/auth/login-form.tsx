"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export type DemoIdentity = {
  id: string;
  label: string;
  organization: string;
  userName: string;
  email: string;
  password: string;
};

export function LoginForm({ demoIdentities }: { demoIdentities: DemoIdentity[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedDemoId, setSelectedDemoId] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function selectDemo(identity: DemoIdentity) {
    setSelectedDemoId(identity.id);
    setEmail(identity.email);
    setPassword(identity.password);
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Sign-in failed.");

      router.replace("/");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign-in failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <div className="brand-mark">A</div>
          <div>
            <div className="brand-title">ActivityHub</div>
            <div className="brand-sub">Secure account activity</div>
          </div>
        </div>

        {demoIdentities.length ? (
          <div className="demo-access">
            <div className="demo-access-label">Quick demo access</div>
            <div className="demo-tabs" role="group" aria-label="Choose a demo user">
              {demoIdentities.map((identity, index) => (
                <button
                  className={`demo-tab${selectedDemoId === identity.id ? " selected" : ""}`}
                  key={identity.id}
                  type="button"
                  aria-pressed={selectedDemoId === identity.id}
                  onClick={() => selectDemo(identity)}
                >
                  <span className="demo-tab-mark">{index === 0 ? "A" : "B"}</span>
                  <span>
                    <strong>{identity.label}</strong>
                    <small>{identity.organization}</small>
                    <small>{identity.userName}</small>
                  </span>
                </button>
              ))}
            </div>
            <p className="demo-access-help">Choose a tenant to fill its demo credentials.</p>
          </div>
        ) : null}

        <h1>Welcome back</h1>
        <p>Sign in with a seeded demo identity to view its organization&apos;s accounts.</p>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <button className="primary-btn login-submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
        {!demoIdentities.length ? (
          <p className="credential-help">Run the demo seed command to enable quick access.</p>
        ) : null}
        {error ? <div className="feedback error show" role="alert">{error}</div> : null}
      </form>
    </section>
  );
}
