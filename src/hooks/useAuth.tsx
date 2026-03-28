import { useState, useCallback } from "react";
import {
  NDKNip07Signer,
  NDKPrivateKeySigner,
  NDKUser,
} from "@nostr-dev-kit/ndk";
import { useNDK } from "../providers/NDKProvider";
import { nip19 } from "nostr-tools";

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
        user.ndk = ndk;
        await user.fetchProfile();
        ndk.signer = signer;
        setCurrentUser(user);
      }
    } catch (error) {
      console.error("Failed to authenticate: ", error);
    } finally {
      setIsLoggingIn(false);
    }
  }, [ndk]);

  const loginWithNsec = useCallback(
    async (nsec: string) => {
      if (!ndk) return;
      try {
        setIsLoggingIn(true);

        const { type, data } = nip19.decode(nsec);
        if (type !== "nsec") throw new Error("Invalid format");

        const hexKey = Array.from(data as Uint8Array)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        const signer = new NDKPrivateKeySigner(hexKey);
        const user = await signer.user();

        if (user) {
          user.ndk = ndk;
          await user.fetchProfile();
          ndk.signer = signer;
          setCurrentUser(user);
        }
      } catch (error) {
        console.error("Error authenticating with nsec: ", error);
        alert("Invalid nsec key");
      } finally {
        setIsLoggingIn(false);
      }
    },
    [ndk],
  );

  const logout = useCallback(() => {
    if (ndk) {
      ndk.signer = undefined;
    }
    setCurrentUser(null);
  }, [ndk]);

  return {
    currentUser,
    isLoggingIn,
    loginWithExtension,
    loginWithNsec,
    logout,
  };
};
