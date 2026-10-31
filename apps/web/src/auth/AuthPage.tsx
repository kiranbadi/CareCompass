import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Heart,
  Leaf,
  LockKeyhole,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Brand } from "../components/Brand";
import { useAuth } from "./AuthContext";
import { authClient } from "./client";
import type { PublicRole } from "./types";
import { navigatePage, skipToContent } from "../navigation";

export function AuthPage({
  mode,
  initialRole = "care_seeker",
}: {
  mode: "login" | "register";
  initialRole?: PublicRole;
}) {
  const { signIn } = useAuth();
  const [role, setRole] = useState<PublicRole>(initialRole);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const registering = mode === "register";
  useEffect(() => {
    setRole(initialRole);
  }, [initialRole]);
  useEffect(() => {
    setPassword("");
    setConfirmation("");
    setVisible(false);
  }, [mode]);

  function switchMode(next: "login" | "register"): void {
    navigatePage(next === "login" ? "/login" : "/register");
    setPassword("");
    setConfirmation("");
    setError(null);
    setNotice(null);
    setVisible(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (registering && password !== confirmation) {
      setError("Passwords do not match");
      return;
    }
    if (new TextEncoder().encode(password).length > 72) {
      setError(
        "Use a password of no more than 72 bytes. Some characters use more than one byte.",
      );
      return;
    }
    setPending(true);
    try {
      if (registering) {
        await authClient.register({
          email: email.trim().toLowerCase(),
          password,
          phone_number: phone,
          role,
        });
        switchMode("login");
        setNotice(
          "Account created. Sign in to get started. Phone verification is pending.",
        );
      } else {
        await signIn(email.trim().toLowerCase(), password);
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Unable to complete request. Please try again.",
      );
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-page">
      <a className="skip-link" href="#auth-form" onClick={skipToContent}>
        Skip to sign in
      </a>
      <header className="site-header">
        <a className="brand-home" href="#/" aria-label="CareBridge home">
          <Brand />
        </a>
        <div className="header-action">
          <span>
            {registering
              ? "Already part of the community?"
              : "New to CareBridge?"}
          </span>
          <button
            className="text-button"
            disabled={pending}
            onClick={() => switchMode(registering ? "login" : "register")}
          >
            {registering ? "Sign in instead" : "Create an account"}
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
      </header>
      <main className={`auth-layout ${registering ? "is-registering" : ""}`}>
        <section className="story-panel" aria-labelledby="story-title">
          <div className="story-content">
            <span className="eyebrow story-eyebrow">
              <span className="little-dot" /> CARE, WITH CONNECTION
            </span>
            <h1 id="story-title">
              A little support.
              <br />A world of
              <br />
              <em>difference.</em>
            </h1>
            <p>
              For the people who need care.
              <br />
              And the people who make it possible.
            </p>
            <div className="connection-art" aria-hidden="true">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <span className="art-leaf">
                <Leaf size={25} strokeWidth={1.3} />
              </span>
              <div className="connection-card seeker-card">
                <span className="person-circle warm">
                  <Users size={26} />
                </span>
                <div>
                  <strong>A helping hand</strong>
                  <span>When it matters most</span>
                </div>
                <span className="art-check">
                  <Check size={13} />
                </span>
              </div>
              <div className="connection-line">
                <span />
                <Heart size={17} fill="currentColor" />
                <span />
              </div>
              <div className="connection-card provider-card">
                <span className="person-circle sage">
                  <Heart size={26} />
                </span>
                <div>
                  <strong>A caring heart</strong>
                  <span>With room for you</span>
                </div>
                <span className="art-check">
                  <Check size={13} />
                </span>
              </div>
            </div>
            <div className="story-footer">
              <ShieldCheck size={19} strokeWidth={1.6} />
              <span>Thoughtful connections. People first.</span>
            </div>
          </div>
          <div className="story-watermark" aria-hidden="true">
            c
          </div>
        </section>
        <section
          className="form-panel"
          aria-labelledby="form-title"
          id="auth-form"
          tabIndex={-1}
        >
          <div className="form-inner">
            <span className="form-illustration">
              <Leaf size={23} strokeWidth={1.5} aria-hidden="true" />
            </span>
            <span className="eyebrow form-eyebrow">YOUR CARE COMMUNITY</span>
            <h2 id="form-title">
              {registering ? "Good care starts here." : "Welcome back."}
            </h2>
            <p className="form-description">
              {registering
                ? "Let’s find your place in the CareBridge community."
                : "Sign in to the people and care that matter."}
            </p>
            {notice && (
              <div className="notice" role="status">
                <Check size={18} aria-hidden="true" />
                <span>{notice}</span>
              </div>
            )}
            {error && (
              <div
                className="form-error"
                role="alert"
                ref={errorRef}
                tabIndex={-1}
              >
                {error}
              </div>
            )}
            <form
              onSubmit={submit}
              aria-label={
                registering
                  ? "Create your CareBridge account"
                  : "Sign in to CareBridge"
              }
            >
              <fieldset disabled={pending} className="form-fields">
                {registering && (
                  <fieldset className="role-options">
                    <legend>I’m here because…</legend>
                    <label
                      className={`role-option ${role === "care_seeker" ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value="care_seeker"
                        checked={role === "care_seeker"}
                        onChange={() => setRole("care_seeker")}
                      />
                      <Users size={20} aria-hidden="true" />
                      <span>
                        <strong>I need care</strong>
                        <small>For myself or a loved one</small>
                      </span>
                    </label>
                    <label
                      className={`role-option ${role === "care_provider" ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value="care_provider"
                        checked={role === "care_provider"}
                        onChange={() => setRole("care_provider")}
                      />
                      <Heart size={20} aria-hidden="true" />
                      <span>
                        <strong>I provide care</strong>
                        <small>Share my skills and support</small>
                      </span>
                    </label>
                  </fieldset>
                )}
                <div className="field">
                  <label htmlFor="email">Email address</label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                {registering && (
                  <div className="field">
                    <label htmlFor="phone">Phone number</label>
                    <input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="+14155550123"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      pattern="\+[1-9][0-9]{7,14}"
                      maxLength={16}
                      aria-describedby="phone-hint"
                      required
                    />
                    <small id="phone-hint">
                      Include your country code. Verification will be required.
                    </small>
                  </div>
                )}
                <div className="field">
                  <label htmlFor="password">Password</label>
                  <div className="password-field">
                    <input
                      id="password"
                      type={visible ? "text" : "password"}
                      autoComplete={
                        registering ? "new-password" : "current-password"
                      }
                      placeholder={
                        registering
                          ? "Create a strong password"
                          : "Enter your password"
                      }
                      minLength={registering ? 12 : undefined}
                      maxLength={72}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      aria-describedby={
                        registering ? "password-hint" : undefined
                      }
                      required
                    />
                    <button
                      type="button"
                      aria-label={visible ? "Hide password" : "Show password"}
                      aria-pressed={visible}
                      onClick={() => setVisible(!visible)}
                    >
                      {visible ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </div>
                  {registering && (
                    <small id="password-hint">
                      At least 12 characters; up to 72 bytes. A longer
                      passphrase works well.
                    </small>
                  )}
                </div>
                {registering && (
                  <div className="field">
                    <label htmlFor="confirm-password">Confirm password</label>
                    <input
                      id="confirm-password"
                      type={visible ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Enter your password again"
                      value={confirmation}
                      onChange={(event) => setConfirmation(event.target.value)}
                      maxLength={72}
                      required
                    />
                  </div>
                )}
                {!registering && (
                  <div className="help-row">
                    <button
                      className="text-button subtle"
                      type="button"
                      aria-expanded={help}
                      onClick={() => setHelp(!help)}
                    >
                      Need help signing in?
                    </button>
                  </div>
                )}
                {help && !registering && (
                  <p className="help-copy">
                    Contact your platform administrator for account access help.
                    After repeated unsuccessful attempts, wait 15 minutes before
                    trying again.
                  </p>
                )}
                <button
                  type="submit"
                  className="primary-button"
                  disabled={pending}
                >
                  {pending
                    ? registering
                      ? "Creating account…"
                      : "Signing in…"
                    : registering
                      ? "Create account"
                      : "Sign in"}
                  {pending ? (
                    <span className="spinner" aria-hidden="true" />
                  ) : (
                    <ArrowRight size={18} aria-hidden="true" />
                  )}
                </button>
              </fieldset>
            </form>
            <p className="privacy-note">
              <LockKeyhole size={14} aria-hidden="true" />
              <span>Your privacy is part of our care.</span>
            </p>
            <div className="form-bottom">
              <span className="divider-line" />
              <span>A place for every kind of care</span>
              <span className="divider-line" />
            </div>
            <p className="inclusive-note">
              For every age. Every ability. Every family.
            </p>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <span>© {new Date().getFullYear()} CareBridge</span>
        <span>
          Built around people, always.
          <Heart size={12} aria-hidden="true" />
        </span>
      </footer>
    </div>
  );
}
