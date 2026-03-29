import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  NDKNip07Signer,
  NDKPrivateKeySigner,
  NDKUser,
} from "@nostr-dev-kit/ndk";
import { useNDK } from "./NDKProvider";
import { nip19 } from "nostr-tools";

interface AuthContextType {
  currentUser: NDKUser | null;
  isLoggingIn: boolean;
  loginWithExtension: () => Promise<void>;
  loginWithNsec: (nsec: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { ndk } = useNDK();
  const [currentUser, setCurrentUser] = useState<NDKUser | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const storedLogin = localStorage.getItem("nostr_login");
    if (storedLogin && ndk && !currentUser) {
      const { method, key } = JSON.parse(storedLogin);

      if (method === "extension") {
        setTimeout(() => loginWithExtension(), 500);
      } else if (method === "nsec" && key) {
        loginWithHex(key);
      }
    }
  }, [ndk]);

  const loginWithHex = async (hexKey: string) => {
    if (!ndk) return;
    try {
      const signer = new NDKPrivateKeySigner(hexKey);
      const user = await signer.user();
      if (user) {
        user.ndk = ndk;
        await user.fetchProfile();
        ndk.signer = signer;
        setCurrentUser(user);
      }
    } catch (error) {
      console.error("An error occurred retoring session: ", error);
      logout();
    }
  };

  const loginWithExtension = useCallback(async () => {
    if (!ndk) return;
    if (!window.nostr) {
      alert("NIP-07 Nostr extension not found");
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
        localStorage.setItem(
          "nostr_login",
          JSON.stringify({ method: "extension" }),
        );
      }
    } catch (error) {
      console.error("Authenticating error:", error);
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
          localStorage.setItem(
            "nostr_login",
            JSON.stringify({ method: "nsec", key: hexKey }),
          );
        }
      } catch (error) {
        console.error("An error occurred to authenticate nsec: ", error);
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
    localStorage.removeItem("nostr_login");
  }, [ndk]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoggingIn,
        loginWithExtension,
        loginWithNsec,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth has to be used inside an AuthProvider");
  }
  return context;
};
