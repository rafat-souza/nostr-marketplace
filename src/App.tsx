import { Outlet } from "react-router-dom";
import { useState } from "react";
import { LoginButton } from "./components/LoginButton";
import { useNDK } from "./providers/NDKProvider";
import { useAuth } from "./providers/AuthProvider";

import "./App.css";

export default function App() {
  const { isConnected } = useNDK();

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
          <LoginButton />
        </div>
      </header>
      <main className="container mx-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}
