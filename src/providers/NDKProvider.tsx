import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import NDK from "@nostr-dev-kit/ndk";

interface NDKContextType {
  ndk: NDK | null;
  isConnected: boolean;
}

const NDKContext = createContext<NDKContextType>({
  ndk: null,
  isConnected: false,
});

const defaultRelays = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.nostr.band",
];

export const NDKProvider = ({ children }: { children: ReactNode }) => {
  const [ndk, setNdk] = useState<NDK | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const ndkInstance = new NDK({
      explicitRelayUrls: defaultRelays,
    });

    setNdk(ndkInstance);

    ndkInstance
      .connect(2500)
      .then(() => setIsConnected(true))
      .catch((error) => {
        console.error(
          "Falha em alguns relays, mas o NDK continuará tentando:",
          error,
        );
        setIsConnected(true);
      });
  }, []);

  return (
    <NDKContext.Provider value={{ ndk, isConnected }}>
      {children}
    </NDKContext.Provider>
  );
};

export const useNDK = () => useContext(NDKContext);
