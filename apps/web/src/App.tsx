import { AuthProvider, useAuth } from "./auth/AuthContext";
import { AuthPage } from "./auth/AuthPage";
import { Brand } from "./components/Brand";
import { Dashboard } from "./components/Dashboard";

function Application() {
  const { user, loading, connectionError, restore } = useAuth();
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
      </main>
    );
  return user ? <Dashboard user={user} /> : <AuthPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <Application />
    </AuthProvider>
  );
}
