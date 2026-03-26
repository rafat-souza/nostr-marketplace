import { Outlet } from "react-router-dom";
import "./App.css";
import { useNDK } from "./providers/NDKProvider";

export default function App() {
  const { isConnected } = useNDK();

  if (!isConnected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-lg text-gray-600">Connecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <header className="bg-white p-4 shadow-sm">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">Nostr Marketplace</h1>
        </div>
      </header>

      <main className="container mx-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}
