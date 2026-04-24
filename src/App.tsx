import { Outlet } from "react-router-dom";
import { LoginButton } from "./components/LoginButton";
import { ChatSidebar } from "./components/ChatSidebar";
import { useNDK } from "./providers/NDKProvider";
import { NavLink } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useChatStore } from "./store/chatStore";

import "./App.css";

export default function App() {
  const { isConnected } = useNDK();

  const { toggleOpen, contacts } = useChatStore();

  if (!isConnected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-lg text-foreground">Connecting...</p>
      </div>
    );
  }

  const totalUnread = contacts.reduce(
    (sum, contact) => sum + contact.unreadCount,
    0,
  );

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <header className="shrink-0 border-b bg-card p-4 shadow-sm z-50">
        <div className="container flex justify-between mx-auto">
          <NavLink to="/" className="text-2xl font-bold" reloadDocument>
            Nostr Marketplace
          </NavLink>
          <div className="flex items-center gap-8">
            <button
              onClick={toggleOpen}
              className="relative p-2 rounded-full hover:bg-accent text-foreground transition-colors cursor-pointer"
              title="Messages"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>

              {totalUnread > 0 && (
                <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm">
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </button>

            <NavLink
              to="/new"
              className="bg-yellow-400 text-black px-4 py-2 rounded-full font-semibold shadow-sm"
            >
              Sell Product
            </NavLink>

            <LoginButton />
          </div>
        </div>
      </header>
      <div className="flex-1 flex relative overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4">
          <div className="container mx-auto">
            <Outlet />
          </div>
        </main>
        <ChatSidebar />
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
}
