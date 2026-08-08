"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createIdempotencyKey } from "@/lib/idempotency-key";
import type {
  ActivityEntry,
  ActivityResponse,
  CreateNoteResponse,
  Workspace,
} from "@/types/activity";

type Feedback = { type: "success" | "error"; message: string } | null;

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function responseJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "The request failed.");
  return payload;
}

function fetchWorkspace() {
  return fetch("/api/workspace").then((response) => responseJson<Workspace>(response));
}

function fetchActivities(accountId: string) {
  return fetch(`/api/accounts/${accountId}/activities`).then((response) =>
    responseJson<ActivityResponse>(response),
  );
}

export function ActivityDashboard() {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaceError, setWorkspaceError] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(true);
  const [isActivityLoading, setIsActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState("");
  const [draft, setDraft] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const selectedAccount = useMemo(
    () => workspace?.accounts.find((account) => account.id === selectedAccountId),
    [selectedAccountId, workspace],
  );

  const requestWorkspace = useCallback(async () => {
    try {
      const data = await fetchWorkspace();
      setWorkspace(data);
      const firstAccountId = data.accounts[0]?.id || "";
      setSelectedAccountId((current) => current || firstAccountId);
      setIsActivityLoading(Boolean(firstAccountId));
    } catch (reason) {
      setWorkspaceError(reason instanceof Error ? reason.message : "Unable to load workspace.");
    } finally {
      setIsWorkspaceLoading(false);
    }
  }, []);

  const requestActivities = useCallback(async (accountId: string) => {
    try {
      const data = await fetchActivities(accountId);
      setActivities(data.activities);
    } catch (reason) {
      setActivities([]);
      setActivityError(reason instanceof Error ? reason.message : "Unable to load activity.");
    } finally {
      setIsActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void fetchWorkspace()
      .then((data) => {
        if (!active) return;
        const firstAccountId = data.accounts[0]?.id || "";
        setWorkspace(data);
        setSelectedAccountId(firstAccountId);
        setIsActivityLoading(Boolean(firstAccountId));
      })
      .catch((reason: unknown) => {
        if (active) {
          setWorkspaceError(reason instanceof Error ? reason.message : "Unable to load workspace.");
        }
      })
      .finally(() => {
        if (active) setIsWorkspaceLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedAccountId) return;
    let active = true;
    void fetchActivities(selectedAccountId)
      .then((data) => {
        if (active) setActivities(data.activities);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setActivities([]);
        setActivityError(reason instanceof Error ? reason.message : "Unable to load activity.");
      })
      .finally(() => {
        if (active) setIsActivityLoading(false);
      });
    return () => { active = false; };
  }, [selectedAccountId]);

  function retryWorkspace() {
    setIsWorkspaceLoading(true);
    setWorkspaceError("");
    void requestWorkspace();
  }

  function selectAccount(accountId: string) {
    setIsActivityLoading(true);
    setActivityError("");
    setSelectedAccountId(accountId);
    setDraft("");
    setFeedback(null);
  }

  function retryActivities() {
    setIsActivityLoading(true);
    setActivityError("");
    void requestActivities(selectedAccountId);
  }

  function updateDraft(value: string) {
    setDraft(value);
    setIdempotencyKey("");
    setFeedback(null);
  }

  async function submitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) {
      setFeedback({ type: "error", message: "Enter a note before submitting." });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const requestKey = idempotencyKey || createIdempotencyKey();
      setIdempotencyKey(requestKey);
      const data = await responseJson<CreateNoteResponse>(
        await fetch(`/api/accounts/${selectedAccountId}/activities`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body, idempotencyKey: requestKey }),
        }),
      );

      setActivities((current) => [
        data.activity,
        ...current.filter((entry) => entry.id !== data.activity.id),
      ]);
      setDraft("");
      setIdempotencyKey("");
      setFeedback({
        type: "success",
        message: data.wasDuplicate
          ? "This note was already saved; no duplicate was created."
          : "Note added successfully.",
      });
    } catch (reason) {
      setFeedback({
        type: "error",
        message: reason instanceof Error ? reason.message : "Unable to add the note.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  }

  if (isWorkspaceLoading) {
    return <FullPageState loading title="Loading workspace" copy="Confirming your organization and accounts…" />;
  }

  if (workspaceError || !workspace) {
    return (
      <FullPageState
        title="Workspace unavailable"
        copy={workspaceError || "Your workspace could not be loaded."}
        action={<button className="primary-btn" onClick={retryWorkspace}>Try again</button>}
      />
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div><div className="brand-title">ActivityHub</div><div className="brand-sub">Multi-tenant SaaS</div></div>
        </div>
        <nav className="nav" aria-label="Primary">
          <div className="nav-item active"><span className="nav-dot" />Accounts</div>
        </nav>
        <div className="sidebar-spacer" />
        <div className="tenant-card">
          <div className="tenant-label">Organization</div>
          <div className="tenant-name">{workspace.organization.name}</div>
          <div className="tenant-user">{workspace.user.email}</div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="breadcrumbs">Accounts / <strong>{selectedAccount?.name ?? "No account"}</strong></div>
          <div className="topbar-actions">
            <div className="user-pill">
              <div className="avatar">{initials(workspace.user.displayName)}</div>
              <div className="user-name">{workspace.user.displayName}</div>
            </div>
            <button className="logout-btn" type="button" onClick={() => void logout()}>Log out</button>
          </div>
        </header>

        <div className="content">
          <section className="hero">
            <div className="eyebrow">Account activity</div>
            <h1>{selectedAccount?.name ?? "Accounts"}</h1>
            <p className="subtitle">Review previous notes and add a new note.</p>
          </section>

          {workspace.accounts.length ? (
            <>
              <section className="toolbar">
                <label htmlFor="accountSelect">Account</label>
                <select
                  id="accountSelect"
                  value={selectedAccountId}
                  onChange={(event) => selectAccount(event.target.value)}
                >
                  {workspace.accounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                  ))}
                </select>
              </section>

              <section className="panel">
                <div className="panel-header">
                  <div><div className="panel-title">Activity</div><div className="panel-meta">{activities.length} note{activities.length === 1 ? "" : "s"} · newest first</div></div>
                </div>

                <form className="composer" onSubmit={submitNote}>
                  <label htmlFor="noteText">Add a note</label>
                  <textarea
                    id="noteText"
                    maxLength={2000}
                    value={draft}
                    onChange={(event) => updateDraft(event.target.value)}
                    placeholder="Write a note…"
                    disabled={isSubmitting}
                  />
                  <div className="composer-footer">
                    <span className="character-count">{draft.length}/2000</span>
                    <button className="primary-btn" disabled={isSubmitting} type="submit">
                      {isSubmitting ? "Adding…" : "Add note"}
                    </button>
                  </div>
                  {feedback ? <div className={`feedback ${feedback.type} show`} role="status">{feedback.message}</div> : null}
                </form>

                <div className="feed" aria-live="polite">
                  {isActivityLoading ? <FeedState loading title="Loading activity" copy="Please wait…" /> : null}
                  {!isActivityLoading && activityError ? (
                    <FeedState
                      title="Activity unavailable"
                      copy={activityError}
                      action={<button className="secondary-btn" onClick={retryActivities}>Try again</button>}
                    />
                  ) : null}
                  {!isActivityLoading && !activityError && activities.length === 0 ? <FeedState title="No activity yet" copy="Add the first note for this account." /> : null}
                  {!isActivityLoading && !activityError
                    ? activities.map((entry) => (
                        <article className="feed-item" key={entry.id}>
                          <div className="feed-avatar">{initials(entry.authorName)}</div>
                          <div><div className="feed-head"><div className="feed-author">{entry.authorName}</div><time className="feed-time" dateTime={entry.createdAt}>{formatTime(entry.createdAt)}</time></div><p className="feed-text">{entry.body}</p></div>
                        </article>
                      ))
                    : null}
                </div>
              </section>
            </>
          ) : <FeedState title="No accounts" copy="Your organization does not have any accounts yet." />}
        </div>
      </main>
    </div>
  );
}

function FeedState({ loading = false, title, copy, action }: { loading?: boolean; title: string; copy: string; action?: React.ReactNode }) {
  return <div className="state">{loading ? <div className="spinner" /> : null}<div className="state-title">{title}</div><p className="state-copy">{copy}</p>{action ? <div className="state-action">{action}</div> : null}</div>;
}

function FullPageState(props: Parameters<typeof FeedState>[0]) {
  return <main className="full-page-state"><div className="state-card"><FeedState {...props} /></div></main>;
}
