import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  FileCheck,
  Heart,
  HeartHandshake,
  LayoutDashboard,
  Leaf,
  LogOut,
  Menu,
  MessageCircle,
  Shield,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Brand } from "./Brand";
import { useAuth } from "../auth/AuthContext";
import { authClient } from "../auth/client";
import type { AuditEvent, Role, UserProfile } from "../auth/types";
import { skipToContent } from "../navigation";

const roleLabels: Record<Role, string> = {
  site_admin: "Site administrator",
  care_seeker: "Care seeker / guardian",
  care_provider: "Care professional",
};
const icons = {
  overview: LayoutDashboard,
  recipients: Users,
  sessions: CalendarDays,
  messages: MessageCircle,
  credentials: FileCheck,
  availability: Clock,
  rates: Heart,
  verification: ShieldCheck,
  users: Users,
  audit: Shield,
};
const panels: Record<
  string,
  { title: string; description: string; items: string[] }
> = {
  recipients: {
    title: "Care recipients",
    description: "A thoughtful picture of each person’s care needs.",
    items: [
      "Profiles support recipients from ages 0–100.",
      "Support categories include mobility, sensory, cognitive, developmental, and other needs.",
      "Recipient editing will be available when the care-profile module is connected.",
    ],
  },
  sessions: {
    title: "Time for better care.",
    description: "Bring every booking into one place.",
    items: [
      "Find the right professional for your family.",
      "Review session details and schedules.",
      "Booking is a planned module; no sessions can be booked in this MVP.",
    ],
  },
  messages: {
    title: "A conversation can make a difference.",
    description: "A place to connect with your care professional.",
    items: [
      "Chats will be available after the messaging module is connected.",
      "No messages or recipient information are stored by this sample workspace.",
    ],
  },
  credentials: {
    title: "Your experience matters.",
    description: "Help families get to know the professional behind the care.",
    items: [
      "Professional license: not submitted",
      "Background check: not initiated",
      "License uploads and background checks are not connected in this MVP.",
    ],
  },
  availability: {
    title: "Care that fits your schedule.",
    description: "Your weekly availability, all in one place.",
    items: [
      "Choose the days and hours that work for you.",
      "Review a weekly availability matrix.",
      "Availability editing is a planned module.",
    ],
  },
  rates: {
    title: "Set your care rate.",
    description: "Clear expectations make stronger connections.",
    items: [
      "Hourly rate: not set",
      "Set a rate that reflects your experience and services.",
      "Rate editing is a planned module.",
    ],
  },
  verification: {
    title: "A community built on trust.",
    description: "Review professional credentials before approving access.",
    items: [
      "Verification approvals must be performed by an administrator.",
      "The approval workflow is not connected in this MVP.",
      "Phone verification and professional verification are separate checks.",
    ],
  },
  users: {
    title: "People at the heart of the platform.",
    description: "Your space for user oversight and account safety.",
    items: [
      "Public sign-up supports care seekers and care providers only.",
      "Inactive accounts are blocked immediately by the API.",
      "User-management controls are not connected in this MVP.",
    ],
  },
};

export function Dashboard({ user }: { user: UserProfile }) {
  const { signOut } = useAuth();
  const [selected, setSelected] = useState("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [audit, setAudit] = useState<AuditEvent[] | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditAttempt, setAuditAttempt] = useState(0);
  const firstAction = user.navigation.find((item) => item.id !== "overview");

  useEffect(() => {
    if (selected !== "audit" || user.role !== "site_admin") return;
    let active = true;
    setAuditLoading(true);
    setError(null);
    authClient
      .getAudit()
      .then((events) => {
        if (active) setAudit(events);
      })
      .catch((failure: Error) => {
        if (active) setError(failure.message);
      })
      .finally(() => {
        if (active) setAuditLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selected, user.role, auditAttempt]);

  async function logout(): Promise<void> {
    setPending(true);
    setError(null);
    try {
      await signOut();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Unable to sign out. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }
  function navigate(id: string): void {
    setSelected(id);
    setMenuOpen(false);
    setError(null);
  }

  return (
    <div className="workspace">
      <a className="skip-link" href="#workspace-main" onClick={skipToContent}>
        Skip to workspace
      </a>
      <header className="mobile-header">
        <a className="brand-home" href="#/" aria-label="CareBridge home">
          <Brand />
        </a>
        <button
          className="icon-button"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <Menu />
        </button>
      </header>
      <aside className={`sidebar ${menuOpen ? "is-open" : ""}`}>
        <div className="sidebar-brand">
          <a className="brand-home" href="#/" aria-label="CareBridge home">
            <Brand />
          </a>
        </div>
        <span className="eyebrow sidebar-label">YOUR WORKSPACE</span>
        <nav aria-label="Main navigation">
          {user.navigation.map((item) => {
            const Icon =
              icons[item.id as keyof typeof icons] ?? LayoutDashboard;
            return (
              <button
                key={item.id}
                className={`nav-item ${selected === item.id ? "active" : ""}`}
                aria-current={selected === item.id ? "page" : undefined}
                onClick={() => navigate(item.id)}
              >
                <Icon size={19} aria-hidden="true" />
                {item.label}
                {selected === item.id && <span className="nav-dot" />}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-note">
          <Leaf size={23} aria-hidden="true" />
          <strong>A little care goes a long way.</strong>
          <p>You belong to a community that puts people first.</p>
        </div>
        <div className="sidebar-account">
          <span className="avatar">{user.email.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{roleLabels[user.role]}</strong>
            <span title={user.email}>{user.email}</span>
          </div>
        </div>
        <button
          className="nav-item sign-out"
          disabled={pending}
          onClick={logout}
        >
          <LogOut size={18} aria-hidden="true" />
          {pending ? "Signing out…" : "Sign out"}
        </button>
      </aside>
      <main className="workspace-main" id="workspace-main" tabIndex={-1}>
        <header className="workspace-header">
          <div>
            <span className="breadcrumb">
              Workspace
              <ChevronRight size={13} aria-hidden="true" />
              {user.navigation.find((item) => item.id === selected)?.label}
            </span>
            <span className="workspace-role">{roleLabels[user.role]}</span>
          </div>
          <span className="secure-badge">
            <ShieldCheck size={15} aria-hidden="true" /> Secure workspace
          </span>
        </header>
        {error && (
          <div role="alert" className="form-error">
            {error}
          </div>
        )}
        <div className="workspace-heading">
          <span className="eyebrow">A LITTLE MORE CONNECTED</span>
          <h1>
            {selected === "overview"
              ? "Your care, connected."
              : selected === "audit"
                ? "A clear record of care."
                : panels[selected]?.title}
          </h1>
          <p>
            {selected === "overview"
              ? "A place to take the next step, with a little support along the way."
              : selected === "audit"
                ? "Authentication activity from your platform, with sensitive details kept out."
                : panels[selected]?.description}
          </p>
        </div>
        {selected === "audit" && user.role === "site_admin" ? (
          <section
            className="dashboard-card audit-card"
            aria-label="Audit events"
          >
            <div className="card-heading">
              <h2>Authentication audit log</h2>
              <span className="live-badge">Live data</span>
            </div>
            {auditLoading ? (
              <p role="status">Loading audit events…</p>
            ) : error ? (
              <button
                className="secondary-button"
                onClick={() => setAuditAttempt((value) => value + 1)}
              >
                Retry audit log
              </button>
            ) : (
              <div className="audit-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Actor ID</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit?.map((event) => (
                      <tr key={event.id}>
                        <td>{event.action.replaceAll("_", " ")}</td>
                        <td>{event.actor_id ?? "Unknown user"}</td>
                        <td>{new Date(event.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {audit?.length === 0 && <p>No audit events yet.</p>}
              </div>
            )}
          </section>
        ) : selected === "overview" ? (
          <>
            <section className="welcome-banner">
              <div>
                <span className="banner-tag">
                  <span /> YOUR NEXT CHAPTER
                </span>
                <h2>
                  {user.role === "care_provider"
                    ? "Make room for meaningful work."
                    : user.role === "site_admin"
                      ? "Help good care grow."
                      : "You don’t have to do it all alone."}
                </h2>
                <p>
                  {user.role === "care_provider"
                    ? "Your skills can make someone’s everyday a little better."
                    : user.role === "site_admin"
                      ? "Thoughtful oversight helps build a stronger community."
                      : "Bring your people, plans, and care together in one thoughtful space."}
                </p>
                {firstAction && (
                  <button
                    className="banner-button"
                    onClick={() => navigate(firstAction.id)}
                  >
                    Get started
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
              <div className="banner-art" aria-hidden="true">
                <div className="banner-circle">
                  <HeartHandshake size={72} strokeWidth={1} />
                </div>
                <Leaf className="floating-leaf" size={36} strokeWidth={1} />
              </div>
            </section>
            <div className="overview-grid">
              <section className="dashboard-card getting-started">
                <div className="card-heading">
                  <h2>A good place to start</h2>
                  <span className="step-count">01 / 03</span>
                </div>
                <p>Little steps. Meaningful connections.</p>
                <div className="step-list">
                  <div className="onboarding-step complete">
                    <span>
                      <Check size={16} aria-hidden="true" />
                    </span>
                    <div>
                      <strong>Create your account</strong>
                      <p>You’re part of the community.</p>
                    </div>
                    <span className="done-label">Done</span>
                  </div>
                  <div className="onboarding-step">
                    <span>2</span>
                    <div>
                      <strong>Verify your phone</strong>
                      <p>
                        {user.phone_verified
                          ? "Your phone has been verified."
                          : "Verification flow is coming soon."}
                      </p>
                    </div>
                    <span className="pending-label">
                      {user.phone_verified ? "Verified" : "Pending"}
                    </span>
                  </div>
                  <div className="onboarding-step">
                    <span>3</span>
                    <div>
                      <strong>
                        {user.role === "care_provider"
                          ? "Add your credentials"
                          : user.role === "site_admin"
                            ? "Review community activity"
                            : "Introduce your care needs"}
                      </strong>
                      <p>
                        {user.role === "site_admin"
                          ? "Your audit log is ready to explore."
                          : "Your workspace is ready to explore."}
                      </p>
                    </div>
                    {firstAction && (
                      <button
                        className="icon-button"
                        aria-label={`Open ${firstAction.label}`}
                        onClick={() => navigate(firstAction.id)}
                      >
                        <ArrowUpRight size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </section>
              <section className="dashboard-card account-card">
                <span className="small-icon">
                  <ShieldCheck size={23} aria-hidden="true" />
                </span>
                <h2>A space you can call yours.</h2>
                <p>Your account and permissions are connected to your role.</p>
                <dl>
                  <div>
                    <dt>Account</dt>
                    <dd className="status-pill">Active</dd>
                  </div>
                  <div>
                    <dt>Phone</dt>
                    <dd>
                      {user.phone_verified
                        ? "Verified"
                        : "Pending verification"}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      {user.role === "care_provider"
                        ? "Professional status"
                        : "Verification"}
                    </dt>
                    <dd>{user.is_verified ? "Verified" : "Not verified"}</dd>
                  </div>
                </dl>
              </section>
            </div>
            <div className="workspace-footnote">
              <Heart size={14} aria-hidden="true" />
              <p>Care starts with listening. Your community starts here.</p>
            </div>
          </>
        ) : (
          <section className="dashboard-card placeholder-panel">
            <div className="sample-label">MVP PREVIEW · SAMPLE WORKSPACE</div>
            <div className="empty-state-icon">
              <Leaf size={37} strokeWidth={1.4} aria-hidden="true" />
            </div>
            <h2>
              {user.navigation.find((item) => item.id === selected)?.label}
            </h2>
            <ul>
              {panels[selected]?.items.map((item) => (
                <li key={item}>
                  <Check size={16} aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <button
              className="secondary-button"
              onClick={() => navigate("overview")}
            >
              Back to overview
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </section>
        )}
        <footer className="dashboard-footer">
          <span>CareBridge · People first, always.</span>
          <span>
            Authentication is live. Care-management screens are MVP previews.
          </span>
        </footer>
      </main>
    </div>
  );
}
