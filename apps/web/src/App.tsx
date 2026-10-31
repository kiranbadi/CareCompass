import { AuthProvider, useAuth } from "./auth/AuthContext";
import { AuthPage } from "./auth/AuthPage";
import { Brand } from "./components/Brand";
import { Dashboard } from "./components/Dashboard";
import { LandingPage } from "./pages/LandingPage";
import { ModulePreview } from "./pages/ModulePreview";
import { navigatePage, usePageRoute } from "./navigation";
import { useEffect } from "react";

function OpenWorkspace() {
  useEffect(() => {
    navigatePage("/workspace");
  }, []);
  return (
    <p role="status" className="session-screen">
      Opening your workspace…
    </p>
  );
}

function Application() {
  const { user, loading, connectionError, restore } = useAuth();
  const { path, params } = usePageRoute();
  useEffect(() => {
    if (
      path === "/" &&
      window.location.hash &&
      !window.location.hash.startsWith("#/")
    ) {
      document
        .getElementById(window.location.hash.slice(1))
        ?.scrollIntoView?.();
    }
  }, [path]);
  if (path === "/") return <LandingPage />;
  if (path === "/care-seeker") return <ModulePreview role="care_seeker" />;
  if (path === "/care-provider") return <ModulePreview role="care_provider" />;
  if (!["/login", "/register", "/workspace"].includes(path))
    return (
      <main className="session-screen">
        <Brand />
        <h1>Let’s find your way home.</h1>
        <a className="home-button" href="#/">
          Back to Home
        </a>
      </main>
    );
  if (loading)
    return (
      <main className="session-screen">
        <Brand />
        <p role="status">Connecting to your care community…</p>
        <span className="spinner dark" aria-hidden="true" />
      </main>
    );
  if (connectionError)
    return (
      <main className="session-screen">
        <Brand />
        <h1>Let’s reconnect.</h1>
        <p role="alert">{connectionError}</p>
        <button className="primary-button" onClick={restore}>
          Try again
        </button>
        <a href="#/">Back to Home</a>
      </main>
    );
  if (user)
    return path === "/workspace" ? (
      <Dashboard user={user} />
    ) : (
      <OpenWorkspace />
    );
  return (
    <AuthPage
      mode={path === "/register" ? "register" : "login"}
      initialRole={
        params.get("role") === "care_provider" ? "care_provider" : "care_seeker"
      }
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Application />
    </AuthProvider>
  );
}
