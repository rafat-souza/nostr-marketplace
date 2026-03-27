import { Outlet } from "react-router-dom";
import "./App.css";
import { useNDK } from "./providers/NDKProvider";
import { useAuth } from "./hooks/useAuth";

export default function App() {
  const { isConnected } = useNDK();
  const { currentUser, isLoggingIn, loginWithExtension, logout } = useAuth();

  if (!isConnected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-lg text-foreground">Connecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card p-4 shadow-sm">
        <div className="container flex justify-between mx-auto">
          <h1 className="text-2xl font-bold">Nostr Marketplace</h1>
          <div>
            {currentUser ? (
              <div className="flex items-center gap-4">
                <span className="text-sm">
                  {currentUser.npub.slice(0, 10)}...{currentUser.npub.slice(-4)}
                </span>
                <button
                  onClick={logout}
                  className="rounded bg-destructive px-4 py-2 text-sm text-destructive-foreground hover:bg-destructive/90"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={loginWithExtension}
                disabled={isLoggingIn}
                className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isLoggingIn ? "Connecting..." : "Log in (NIP-07)"}
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="container mx-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}
