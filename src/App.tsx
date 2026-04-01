import { Outlet } from "react-router-dom";
import { LoginButton } from "./components/LoginButton";
import { useNDK } from "./providers/NDKProvider";
import { NavLink } from "react-router-dom";

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
          <NavLink to="/" className="text-2xl font-bold">
            Nostr Marketplace
          </NavLink>
          <div className="flex items-center gap-10">
            <ul>
              <li>
                <NavLink
                  to="/new"
                  className="bg-yellow-400 text-black px-4 py-2 rounded-full 
                  font-semibold shadow-sm"
                >
                  Sell Product
                </NavLink>
              </li>
            </ul>
            <LoginButton />
          </div>
        </div>
      </header>
      <main className="container mx-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}
