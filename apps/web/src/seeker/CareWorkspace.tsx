import { useEffect, useState, type FormEvent } from "react";
import {
  CalendarDays,
  Check,
  Clock,
  Pencil,
  Plus,
  Users,
  X,
} from "lucide-react";
import { demoProviders } from "../search/providers";
import "../provider/credentials.css";
import "./care-workspace.css";

const needs = [
  "Mobility",
  "Sensory",
  "Cognitive",
  "Developmental",
  "Companionship",
  "Personal care",
];
const services = [
  "Companionship",
  "Family respite",
  "Developmental support",
  "Mobility assistance",
  "Personal care",
];
interface Recipient {
  id: string;
  name: string;
  age: number;
  relationship: string;
  needs: string[];
  notes: string;
}
interface CareSession {
  id: string;
  recipientId: string;
  providerId: string;
  service: string;
  date: string;
  start: string;
  end: string;
  status: "Planned" | "Completed" | "Cancelled";
  notes: string;
}
interface CareData {
  version: 1;
  recipients: Recipient[];
  sessions: CareSession[];
}
const dateAfter = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
function sampleData(): CareData {
  return {
    version: 1,
    recipients: [
      {
        id: "sample-alex",
        name: "Alex Morgan",
        age: 8,
        relationship: "Child",
        needs: ["Sensory", "Developmental"],
        notes:
          "Fictional example: enjoys drawing and a calm, predictable routine.",
      },
      {
        id: "sample-riley",
        name: "Riley Morgan",
        age: 72,
        relationship: "Parent",
        needs: ["Mobility", "Companionship"],
        notes:
          "Fictional example: enjoys garden walks and talking about books.",
      },
      {
        id: "sample-samira",
        name: "Samira Morgan",
        age: 34,
        relationship: "Sibling",
        needs: ["Personal care", "Companionship"],
        notes:
          "Fictional example: prefers an introduction before each activity.",
      },
    ],
    sessions: [
      {
        id: "sample-session-1",
        recipientId: "sample-alex",
        providerId: "maya",
        service: "Family respite",
        date: dateAfter(2),
        start: "10:00",
        end: "12:00",
        status: "Planned",
        notes: "Sample plan: a quiet creative activity and a snack break.",
      },
      {
        id: "sample-session-2",
        recipientId: "sample-riley",
        providerId: "jordan",
        service: "Mobility assistance",
        date: dateAfter(4),
        start: "14:00",
        end: "16:00",
        status: "Planned",
        notes: "Sample plan: a short walk, followed by time for conversation.",
      },
      {
        id: "sample-session-3",
        recipientId: "sample-samira",
        providerId: "avery",
        service: "Companionship",
        date: dateAfter(-3),
        start: "09:00",
        end: "11:00",
        status: "Completed",
        notes: "Fictional completed session for demonstration.",
      },
    ],
  };
}
function readCareData(raw: string): CareData {
  const data = JSON.parse(raw) as CareData;
  if (
    !data ||
    data.version !== 1 ||
    !Array.isArray(data.recipients) ||
    !Array.isArray(data.sessions)
  )
    throw new Error("Invalid local care data");
  if (
    !data.recipients.every(
      (r) =>
        r &&
        typeof r.id === "string" &&
        typeof r.name === "string" &&
        Number.isInteger(r.age) &&
        r.age >= 0 &&
        r.age <= 100 &&
        typeof r.relationship === "string" &&
        Array.isArray(r.needs) &&
        r.needs.every((n) => typeof n === "string") &&
        typeof r.notes === "string",
    )
  )
    throw new Error("Invalid recipient");
  if (
    !data.sessions.every(
      (s) =>
        s &&
        [
          "id",
          "recipientId",
          "providerId",
          "service",
          "date",
          "start",
          "end",
          "notes",
        ].every((key) => typeof s[key as keyof CareSession] === "string") &&
        ["Planned", "Completed", "Cancelled"].includes(s.status),
    )
  )
    throw new Error("Invalid session");
  return data;
}
function dateLabel(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
const emptyRecipient = (): Recipient => ({
  id: "",
  name: "",
  age: 0,
  relationship: "Child",
  needs: [],
  notes: "",
});
const emptySession = (recipientId: string): CareSession => ({
  id: "",
  recipientId,
  providerId: "maya",
  service: "Companionship",
  date: dateAfter(1),
  start: "10:00",
  end: "12:00",
  status: "Planned",
  notes: "",
});

export function CareWorkspace({
  userId,
  view,
  onNavigate,
}: {
  userId: string;
  view: "recipients" | "sessions";
  onNavigate: (view: string) => void;
}) {
  const key = `carebridge:seeker-workspace:v1:${encodeURIComponent(userId)}`;
  const [data, setData] = useState<CareData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [editor, setEditor] = useState<"recipient" | "session" | null>(null);
  const [recipient, setRecipient] = useState<Recipient>(emptyRecipient);
  const [session, setSession] = useState<CareSession>(() => emptySession(""));
  const [detailId, setDetailId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [filter, setFilter] = useState("All");
  useEffect(() => {
    function load(): void {
      try {
        const raw = localStorage.getItem(key);
        const current = raw === null ? sampleData() : readCareData(raw);
        if (raw === null) localStorage.setItem(key, JSON.stringify(current));
        setData(current);
        setBlocked(false);
        setError(null);
      } catch {
        setData((current) => current ?? sampleData());
        setBlocked(true);
        setError(
          "Browser data could not be loaded or saved. Showing a read-only demo; existing local data has not been overwritten.",
        );
      }
    }
    load();
    const listen = (event: StorageEvent): void => {
      if (event.key === key || event.key === null) load();
    };
    window.addEventListener("storage", listen);
    return () => window.removeEventListener("storage", listen);
  }, [key]);
  function change(
    update: (current: CareData) => CareData,
    message: string,
  ): boolean {
    if (blocked) return false;
    try {
      const raw = localStorage.getItem(key);
      const next = update(raw === null ? data! : readCareData(raw));
      localStorage.setItem(key, JSON.stringify(next));
      setData(next);
      setNotice(message);
      setError(null);
      return true;
    } catch {
      setError(
        "Changes could not be saved. Check browser storage and try again. Your form has been kept.",
      );
      return false;
    }
  }
  function openRecipient(item?: Recipient): void {
    setRecipient(item ? { ...item, needs: [...item.needs] } : emptyRecipient());
    setEditor("recipient");
    setNotice(null);
  }
  function openSession(recipientId?: string, item?: CareSession): void {
    setSession(
      item
        ? { ...item }
        : emptySession(recipientId ?? data?.recipients[0]?.id ?? ""),
    );
    setEditor("session");
    setNotice(null);
    setFilter("All");
    onNavigate("sessions");
  }
  function saveRecipient(event: FormEvent): void {
    event.preventDefault();
    if (
      !recipient.name.trim() ||
      !Number.isInteger(recipient.age) ||
      recipient.age < 0 ||
      recipient.age > 100
    ) {
      setError("Enter a name and an age from 0 to 100.");
      return;
    }
    const record = {
      ...recipient,
      id: recipient.id || crypto.randomUUID(),
      name: recipient.name.trim(),
      notes: recipient.notes.trim(),
    };
    if (
      change(
        (current) => ({
          ...current,
          recipients: recipient.id
            ? current.recipients.map((r) => (r.id === record.id ? record : r))
            : [...current.recipients, record],
        }),
        "Care recipient saved in this browser.",
      )
    )
      setEditor(null);
  }
  function saveSession(event: FormEvent): void {
    event.preventDefault();
    if (!session.recipientId || session.end <= session.start) {
      setError("Choose a recipient and an end time after the start time.");
      return;
    }
    const record = {
      ...session,
      id: session.id || crypto.randomUUID(),
      notes: session.notes.trim(),
    };
    if (
      change((current) => {
        if (!current.recipients.some((r) => r.id === record.recipientId))
          throw new Error("Recipient missing");
        return {
          ...current,
          sessions: session.id
            ? current.sessions.map((s) => (s.id === record.id ? record : s))
            : [...current.sessions, record],
        };
      }, "Demo session saved. No real booking or notification was made.")
    )
      setEditor(null);
  }
  if (!data) return <p role="status">Loading your care workspace…</p>;
  const planned = data.sessions.filter((s) => s.status === "Planned").length;
  return (
    <div className="seeker-care-workspace">
      <div className="local-storage-note">
        <Users size={20} aria-hidden="true" />
        <p>
          <strong>Demo workspace · Browser storage.</strong> Starts with
          fictional people and sessions. Changes stay in this browser for your
          account; session actions do not create real bookings. Use sample
          information only.
        </p>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      <div className="care-summary">
        <div>
          <span>Care recipients</span>
          <strong>{data.recipients.length}</strong>
        </div>
        <div>
          <span>Planned sessions</span>
          <strong>{planned}</strong>
        </div>
        <div>
          <span>Completed sessions</span>
          <strong>
            {data.sessions.filter((s) => s.status === "Completed").length}
          </strong>
        </div>
      </div>
      <div className="provider-section-heading">
        <div>
          {view === "recipients" ? (
            <Users size={24} aria-hidden="true" />
          ) : (
            <CalendarDays size={24} aria-hidden="true" />
          )}
          <div>
            <h2>
              {view === "recipients"
                ? "Your care circle"
                : "Your care calendar"}
            </h2>
            <p>
              {view === "recipients"
                ? "A little understanding makes a meaningful difference."
                : "Keep your sample care plans together in one place."}
            </p>
          </div>
        </div>
        <button
          className="secondary-button"
          disabled={blocked}
          onClick={() =>
            view === "recipients" ? openRecipient() : openSession()
          }
        >
          <Plus size={16} aria-hidden="true" />
          {view === "recipients" ? "Add care recipient" : "Plan a session"}
        </button>
      </div>
      {editor === "recipient" && view === "recipients" && (
        <form
          className="provider-record-form"
          onSubmit={saveRecipient}
          aria-label="Care recipient form"
        >
          <div className="record-form-heading">
            <h3>
              {recipient.id ? "Edit care recipient" : "Add care recipient"}
            </h3>
            <button
              className="icon-button"
              type="button"
              onClick={() => setEditor(null)}
              aria-label="Close recipient form"
            >
              <X size={19} />
            </button>
          </div>
          <div className="record-form-grid">
            <div className="field">
              <label htmlFor="recipient-name">Name *</label>
              <input
                id="recipient-name"
                value={recipient.name}
                onChange={(e) =>
                  setRecipient({ ...recipient, name: e.target.value })
                }
                maxLength={100}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="recipient-age">Age (0–100) *</label>
              <input
                id="recipient-age"
                type="number"
                min={0}
                max={100}
                step={1}
                value={Number.isNaN(recipient.age) ? "" : recipient.age}
                onChange={(e) =>
                  setRecipient({
                    ...recipient,
                    age: e.target.value === "" ? NaN : Number(e.target.value),
                  })
                }
                required
              />
            </div>
            <div className="field">
              <label htmlFor="recipient-relationship">Relationship</label>
              <select
                id="recipient-relationship"
                value={recipient.relationship}
                onChange={(e) =>
                  setRecipient({ ...recipient, relationship: e.target.value })
                }
              >
                {["Child", "Parent", "Sibling", "Partner", "Self", "Other"].map(
                  (value) => (
                    <option key={value}>{value}</option>
                  ),
                )}
              </select>
            </div>
            <fieldset className="care-needs">
              <legend>Support needs</legend>
              {needs.map((need) => (
                <label key={need}>
                  <input
                    type="checkbox"
                    checked={recipient.needs.includes(need)}
                    onChange={(e) =>
                      setRecipient({
                        ...recipient,
                        needs: e.target.checked
                          ? [...recipient.needs, need]
                          : recipient.needs.filter((n) => n !== need),
                      })
                    }
                  />
                  {need}
                </label>
              ))}
            </fieldset>
            <div className="field record-notes-field">
              <label htmlFor="recipient-notes">Preferences / notes</label>
              <textarea
                id="recipient-notes"
                value={recipient.notes}
                onChange={(e) =>
                  setRecipient({ ...recipient, notes: e.target.value })
                }
                rows={3}
                maxLength={500}
              />
            </div>
          </div>
          <div className="record-form-actions">
            <button type="submit" className="primary-button">
              Save care recipient
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setEditor(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {editor === "session" && view === "sessions" && (
        <form
          className="provider-record-form"
          onSubmit={saveSession}
          aria-label="Session form"
        >
          <div className="record-form-heading">
            <h3>{session.id ? "Edit session" : "Plan a demo session"}</h3>
            <button
              className="icon-button"
              type="button"
              onClick={() => setEditor(null)}
              aria-label="Close session form"
            >
              <X size={19} />
            </button>
          </div>
          <div className="record-form-grid">
            <div className="field">
              <label htmlFor="session-recipient">Care recipient *</label>
              <select
                id="session-recipient"
                required
                value={session.recipientId}
                onChange={(e) =>
                  setSession({ ...session, recipientId: e.target.value })
                }
              >
                {data.recipients.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="session-provider">Sample care provider *</label>
              <select
                id="session-provider"
                required
                value={session.providerId}
                onChange={(e) =>
                  setSession({ ...session, providerId: e.target.value })
                }
              >
                {demoProviders.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · ${p.hourlyRate}/hr
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="session-service">Service *</label>
              <select
                id="session-service"
                value={session.service}
                onChange={(e) =>
                  setSession({ ...session, service: e.target.value })
                }
              >
                {services.map((service) => (
                  <option key={service}>{service}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="session-date">Date *</label>
              <input
                id="session-date"
                type="date"
                required
                value={session.date}
                onChange={(e) =>
                  setSession({ ...session, date: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="session-start">Start time *</label>
              <input
                id="session-start"
                type="time"
                required
                value={session.start}
                onChange={(e) =>
                  setSession({ ...session, start: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="session-end">End time *</label>
              <input
                id="session-end"
                type="time"
                required
                value={session.end}
                onChange={(e) =>
                  setSession({ ...session, end: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="session-status">Demo status</label>
              <select
                id="session-status"
                value={session.status}
                onChange={(e) =>
                  setSession({
                    ...session,
                    status: e.target.value as CareSession["status"],
                  })
                }
              >
                {["Planned", "Completed", "Cancelled"].map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>
            <div className="field record-notes-field">
              <label htmlFor="session-notes">Session notes</label>
              <textarea
                id="session-notes"
                value={session.notes}
                onChange={(e) =>
                  setSession({ ...session, notes: e.target.value })
                }
                maxLength={500}
                rows={3}
              />
            </div>
          </div>
          <div className="record-form-actions">
            <button className="primary-button" type="submit">
              Save demo session
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setEditor(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {view === "recipients" ? (
        <div className="provider-record-grid">
          {data.recipients.map((item, index) => (
            <article key={item.id} className="provider-record-card">
              <div className="record-card-top">
                <span className={`demo-avatar ${index % 2 ? "peach" : "sage"}`}>
                  {item.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="record-status">{item.relationship}</span>
              </div>
              <h3>{item.name}</h3>
              <p className="record-organization">
                Age {item.age} · {item.needs.length} support{" "}
                {item.needs.length === 1 ? "area" : "areas"}
              </p>
              <div className="care-need-tags">
                {item.needs.map((need) => (
                  <span key={need}>{need}</span>
                ))}
              </div>
              {detailId === item.id && (
                <p className="record-notes">
                  {item.notes || "No preferences added yet."}
                </p>
              )}
              <div className="record-card-actions care-actions">
                <button
                  onClick={() =>
                    setDetailId(detailId === item.id ? null : item.id)
                  }
                  aria-expanded={detailId === item.id}
                >
                  {detailId === item.id ? "Hide details" : "View details"}
                </button>
                <button disabled={blocked} onClick={() => openRecipient(item)}>
                  <Pencil size={14} aria-hidden="true" />
                  Edit
                </button>
                <button disabled={blocked} onClick={() => openSession(item.id)}>
                  <CalendarDays size={14} aria-hidden="true" />
                  Plan session
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <>
          <div
            className="session-filters"
            role="group"
            aria-label="Filter sessions"
          >
            {["All", "Planned", "Completed", "Cancelled"].map((status) => (
              <button
                key={status}
                aria-pressed={filter === status}
                onClick={() => setFilter(status)}
              >
                {status}
              </button>
            ))}
          </div>
          <div className="provider-record-grid">
            {data.sessions
              .filter((item) => filter === "All" || item.status === filter)
              .map((item) => {
                const person = data.recipients.find(
                  (r) => r.id === item.recipientId,
                );
                const provider = demoProviders.find(
                  (p) => p.id === item.providerId,
                );
                const [sh, sm] = item.start.split(":").map(Number);
                const [eh, em] = item.end.split(":").map(Number);
                const estimate =
                  ((eh * 60 + em - sh * 60 - sm) / 60) *
                  (provider?.hourlyRate ?? 0);
                return (
                  <article className="provider-record-card" key={item.id}>
                    <div className="record-card-top">
                      <span>{item.service}</span>
                      <span
                        className={`record-status ${item.status === "Cancelled" ? "expired" : ""}`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <h3>{person?.name ?? "Care recipient"}</h3>
                    <p className="record-organization">
                      With {provider?.name ?? "Sample provider"}
                    </p>
                    <dl>
                      <div>
                        <dt>
                          <CalendarDays size={13} aria-hidden="true" /> Date
                        </dt>
                        <dd>{dateLabel(item.date)}</dd>
                      </div>
                      <div>
                        <dt>
                          <Clock size={13} aria-hidden="true" /> Time
                        </dt>
                        <dd>
                          {item.start}–{item.end}
                        </dd>
                      </div>
                      <div>
                        <dt>Sample estimate</dt>
                        <dd>${estimate.toFixed(2)}</dd>
                      </div>
                    </dl>
                    {item.notes && <p className="record-notes">{item.notes}</p>}
                    {cancelId === item.id ? (
                      <div className="record-remove-confirm">
                        <p>Cancel this demo session?</p>
                        <button
                          onClick={() => {
                            if (
                              change(
                                (current) => ({
                                  ...current,
                                  sessions: current.sessions.map((s) =>
                                    s.id === item.id
                                      ? { ...s, status: "Cancelled" }
                                      : s,
                                  ),
                                }),
                                "Demo session cancelled. No real provider was notified.",
                              )
                            )
                              setCancelId(null);
                          }}
                        >
                          Confirm cancellation
                        </button>
                        <button onClick={() => setCancelId(null)}>
                          Keep session
                        </button>
                      </div>
                    ) : (
                      <div className="record-card-actions care-actions">
                        <button
                          disabled={blocked}
                          onClick={() => openSession(undefined, item)}
                        >
                          <Pencil size={14} aria-hidden="true" />
                          Edit session
                        </button>
                        {item.status === "Planned" && (
                          <>
                            <button
                              disabled={blocked}
                              onClick={() =>
                                change(
                                  (current) => ({
                                    ...current,
                                    sessions: current.sessions.map((s) =>
                                      s.id === item.id
                                        ? { ...s, status: "Completed" }
                                        : s,
                                    ),
                                  }),
                                  "Demo session marked completed.",
                                )
                              }
                            >
                              <Check size={14} aria-hidden="true" />
                              Mark complete
                            </button>
                            <button
                              disabled={blocked}
                              onClick={() => setCancelId(item.id)}
                            >
                              Cancel session
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
          </div>
          {!data.sessions.some(
            (item) => filter === "All" || item.status === filter,
          ) && (
            <div className="records-empty">
              <CalendarDays size={28} aria-hidden="true" />
              <p>No {filter.toLowerCase()} sessions to show.</p>
              <span>Plan a session or choose another filter.</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
