import { useState, useCallback } from "react";
import { NDKNip07Signer, NDKUser } from "@nostr-dev-kit/ndk";
import { useNDK } from "../providers/NDKProvider";

export const useAuth = () => {
  const { ndk } = useNDK();
  const [currentUser, setCurrentUser] = useState<NDKUser | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const loginWithExtension = useCallback(async () => {
    if (!ndk) return;

    if (!window.nostr) {
      alert(
        "NIP-07 extension not found. Install a signer NIP-07 extension like Alby or nos2x.",
      );
      return;
    }

    try {
      setIsLoggingIn(true);

      const signer = new NDKNip07Signer();

      const user = await signer.user();

      if (user) {
        ndk.signer = signer;
        setCurrentUser(user);
      }
    } catch (error) {
      console.error("Failed to authenticate: ", error);
    } finally {
      setIsLoggingIn(false);
    }
  }, [ndk]);

  const logout = useCallback(() => {
    if (ndk) {
      ndk.signer = undefined;
    }
    setCurrentUser(null);
  }, [ndk]);

  return { currentUser, isLoggingIn, loginWithExtension, logout };
};
