import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export function LoginButton() {
  const {
    currentUser,
    isLoggingIn,
    loginWithExtension,
    loginWithNsec,
    logout,
  } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nsecInput, setNsecInput] = useState("");

  const handleExtensionLogin = async () => {
    await loginWithExtension();
    setIsModalOpen(false);
  };

  const handleNsecLogin = async () => {
    if (!nsecInput) return;
    await loginWithNsec(nsecInput);
    setIsModalOpen(false);
    setNsecInput("");
  };

  if (currentUser) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm">
          {currentUser.npub.slice(0, 10)}...{currentUser.npub.slice(-4)}
        </span>
        <button
          onClick={logout}
          className="rounded bg-destructive px-4 py-2 text-sm text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 cursor-pointer"
      >
        Log in
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-card p-6 rounded-lg shadow-lg w-96 border border-border">
            <h2 className="text-xl font-bold mb-4">Choose a way to log in</h2>

            <button
              onClick={handleExtensionLogin}
              disabled={isLoggingIn}
              className="w-full mb-4 rounded bg-primary px-4 py-2 text-sm text-primary-foreground
              hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
            >
              Use Browser Extension (NIP-07)
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-border"></div>
              <span className="flex-shrink-0 mx-4 text-muted-foreground text-sm">
                or
              </span>
              <div className="flex-grow border-t border-border"></div>
            </div>

            <div className="mt-4">
              <label className="block text-sm mb-1 text-muted-foreground">
                Private Key (nsec)
              </label>
              <input
                type="password"
                value={nsecInput}
                onChange={(e) => setNsecInput(e.target.value)}
                placeholder="nsec1..."
                className="w-full p-2 mb-2 rounded bg-background border border-input text-foreground 
                focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={handleNsecLogin}
                disabled={isLoggingIn || !nsecInput}
                className="w-full rounded bg-secondary px-4 py-2 text-sm 
                text-secondary-foreground hover:bg-secondary/90 disabled:opacity-50 cursor-pointer"
              >
                Login with nsec
              </button>
            </div>

            <button
              onClick={() => setIsModalOpen(false)}
              className="mt-4 w-full text-sm text-muted-foreground hover:underline cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
