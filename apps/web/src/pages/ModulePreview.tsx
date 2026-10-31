import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock,
  FileCheck,
  Heart,
  MessageCircle,
  Users,
} from "lucide-react";
import { PublicLayout } from "../components/PublicLayout";
import { useAuth } from "../auth/AuthContext";
import type { PublicRole } from "../auth/types";

export function ModulePreview({ role }: { role: PublicRole }) {
  const { user } = useAuth();
  const provider = role === "care_provider";
  return (
    <PublicLayout>
      <main id="page-content" className="module-preview-page" tabIndex={-1}>
        <a className="module-back" href="#/">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to Home
        </a>
        <div className="module-preview-heading">
          <span className="home-kicker">
            {provider ? "CARE PROVIDER MODULE" : "CARE SEEKER MODULE"}
          </span>
          <h1>
            {provider ? "Make your care count." : "Support for your everyday."}
          </h1>
          <p>
            {provider
              ? "A preview of your professional care workspace, shaped around your strengths."
              : "A preview of a simpler place for the people, plans, and support that matter."}
          </p>
          <span className="demo-pill">MVP PREVIEW · FICTIONAL SAMPLE DATA</span>
        </div>
        {provider ? (
          <div className="module-preview-grid">
            <section className="module-card">
              <span className="module-card-icon">
                <FileCheck size={23} />
              </span>
              <h2>Credentials & checks</h2>
              <p>Your experience deserves a clear introduction.</p>
              <dl>
                <div>
                  <dt>Professional license</dt>
                  <dd>Not submitted</dd>
                </div>
                <div>
                  <dt>Background check</dt>
                  <dd>Not initiated</dd>
                </div>
              </dl>
              <p className="module-limit">
                Upload and verification workflows are planned.
              </p>
            </section>
            <section className="module-card">
              <span className="module-card-icon">
                <CalendarDays size={23} />
              </span>
              <h2>A week that works for you</h2>
              <p>Sample availability, shown for illustration.</p>
              <div
                className="sample-week"
                aria-label="Sample weekday availability"
              >
                {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                  <span key={index} className={index < 5 ? "available" : ""}>
                    {day}
                    {index < 5 ? (
                      <Check size={12} aria-hidden="true" />
                    ) : (
                      <span>—</span>
                    )}
                  </span>
                ))}
              </div>
              <p className="module-limit">
                The availability editor is not connected yet.
              </p>
            </section>
            <section className="module-card">
              <span className="module-card-icon">
                <Heart size={23} />
              </span>
              <h2>Your care, clearly valued</h2>
              <p>Set clear expectations for your services.</p>
              <div className="sample-rate">
                $28<span>/ hour · sample value</span>
              </div>
              <p className="module-limit">
                Hourly-rate editing is a planned feature.
              </p>
            </section>
          </div>
        ) : (
          <div className="module-preview-grid">
            <section className="module-card">
              <span className="module-card-icon">
                <Users size={23} />
              </span>
              <h2>Your care circle</h2>
              <p>Every person has their own story.</p>
              <div className="sample-recipient">
                <span className="demo-avatar sage">A</span>
                <div>
                  <strong>Alex · age 8</strong>
                  <small>Sensory & developmental support</small>
                </div>
              </div>
              <div className="sample-recipient">
                <span className="demo-avatar peach">R</span>
                <div>
                  <strong>Riley · age 72</strong>
                  <small>Mobility & companionship</small>
                </div>
              </div>
              <p className="module-limit">
                Fictional examples. Recipient editing is planned.
              </p>
            </section>
            <section className="module-card">
              <span className="module-card-icon">
                <Clock size={23} />
              </span>
              <h2>A little support, scheduled</h2>
              <p>A glimpse of your future care calendar.</p>
              <div className="sample-session">
                <strong>Saturday morning</strong>
                <span>10:00–12:00 · Family respite</span>
              </div>
              <div className="sample-session">
                <strong>Weekday afternoon</strong>
                <span>14:00–16:00 · Companionship</span>
              </div>
              <p className="module-limit">
                Sample sessions only. Booking is not available.
              </p>
            </section>
            <section className="module-card">
              <span className="module-card-icon">
                <MessageCircle size={23} />
              </span>
              <h2>Start with a conversation</h2>
              <p>
                A shared space for understanding care needs, expectations, and
                the small details that matter.
              </p>
              <div className="sample-message">
                “A little patience makes a big difference.”
                <span>Illustrative message</span>
              </div>
              <p className="module-limit">Messaging is a planned feature.</p>
            </section>
          </div>
        )}
        <section className="module-join">
          <div>
            <h2>
              {provider
                ? "Ready to introduce your care?"
                : "Ready to take your first step?"}
            </h2>
            <p>
              One registration for care seekers and care providers. Choose your
              role as you join.
            </p>
          </div>
          <a
            className="home-button"
            href={user ? "#/workspace" : `#/register?role=${role}`}
          >
            {user
              ? "Open my workspace"
              : provider
                ? "Join as a care provider"
                : "Join as a care seeker"}
            <ArrowRight size={17} aria-hidden="true" />
          </a>
        </section>
        <p className="module-sign-in">
          Already a member? <a href="#/login">Log in to your workspace</a>
        </p>
      </main>
    </PublicLayout>
  );
}
