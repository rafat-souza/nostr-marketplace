import { useEffect, useCallback, useRef } from "react";
import NDK, { NDKEvent, type NDKFilter } from "@nostr-dev-kit/ndk";
import { useNDK } from "../providers/NDKProvider";
import { useAuth } from "../providers/AuthProvider";
import { useChatStore } from "../store/chatStore";
import toast from "react-hot-toast";

const DM_KIND = 4;

export function useChat() {
  const { ndk } = useNDK();
  const { currentUser } = useAuth();
  const {
    addMessage,
    addOrUpdateContact,
    setContactProfile,
    activeContact,
    messages,
    updateMessageContent,
  } = useChatStore();

  const subscriptionRef = useRef<ReturnType<NDK["subscribe"]> | null>(null);

  const decryptEvent = useCallback(
    async (event: NDKEvent): Promise<boolean> => {
      if (!ndk || !currentUser) return false;
      if (!event.content.includes("?iv=")) return true;

      const counterpartyPubkey =
        event.pubkey === currentUser.pubkey
          ? event.tags.find((t) => t[0] === "p")?.[1]
          : event.pubkey;

      if (!counterpartyPubkey) {
        console.warn("[chat] No counterparty for event", event.id);
        return false;
      }

      if (!event.ndk) {
        event.ndk = ndk;
      }

      try {
        const counterparty = ndk.getUser({ pubkey: counterpartyPubkey });
        const signer = ndk.signer;
        if (!signer) throw new Error("No signer available");

        await event.decrypt(counterparty, signer, "nip04");
        console.log("[chat] Decrypted:", event.id);
        return true;
      } catch (error) {
        console.warn(
          "[chat] Decrypt failed for",
          event.id,
          "counterparty:",
          counterpartyPubkey,
          error,
        );
        return false;
      }
    },
    [ndk, currentUser],
  );

  const fetchConversations = useCallback(async () => {
    if (!ndk || !currentUser) return;

    try {
      const filter: NDKFilter = {
        kinds: [DM_KIND],
        limit: 500,
      };

      const receivedPromise = ndk.fetchEvents({
        ...filter,
        "#p": [currentUser.pubkey],
      });

      const sentPromise = ndk.fetchEvents({
        ...filter,
        authors: [currentUser.pubkey],
      });

      const [received, sent] = await Promise.all([
        receivedPromise,
        sentPromise,
      ]);

      const allEvents = Array.from(
        new Set([...Array.from(received), ...Array.from(sent)]),
      );

      console.log("[chat] Fetched", allEvents.length, "events");

      const contactPubkeys = new Set<string>();

      for (const event of allEvents) {
        const otherPubkey =
          event.pubkey === currentUser.pubkey
            ? event.tags.find((t) => t[0] === "p")?.[1]
            : event.pubkey;

        if (!otherPubkey) continue;

        contactPubkeys.add(otherPubkey);
        addOrUpdateContact(otherPubkey);

        const isMine = event.pubkey === currentUser.pubkey;
        const decrypted = await decryptEvent(event);

        addMessage(otherPubkey, {
          id: event.id,
          pubkey: event.pubkey,
          content: event.content,
          createdAt: event.created_at || 0,
          isMine,
        });

        if (!decrypted) {
          console.warn("[chat] Remains encrypted:", event.id);
        }
      }

      for (const pubkey of contactPubkeys) {
        try {
          const user = ndk.getUser({ pubkey });
          const profile = await user.fetchProfile();
          if (profile) setContactProfile(pubkey, profile);
        } catch (e) {
          console.error("Profile fetch error:", e);
        }
      }
    } catch (error) {
      console.error("Fetch error:", error);
    }
  }, [
    ndk,
    currentUser,
    addMessage,
    addOrUpdateContact,
    setContactProfile,
    decryptEvent,
  ]);

  const sendMessage = useCallback(
    async (pubkey: string, content: string) => {
      if (!ndk || !currentUser) {
        toast.error("You must be logged in to send messages.");
        return false;
      }

      try {
        const recipient = ndk.getUser({ pubkey });
        const event = new NDKEvent(ndk);
        event.kind = DM_KIND;
        event.content = content;
        event.tags = [["p", pubkey]];

        await event.encrypt(recipient, undefined, "nip04");
        await event.publish();

        addMessage(pubkey, {
          id: event.id,
          pubkey: currentUser.pubkey,
          content,
          createdAt: Math.floor(Date.now() / 1000),
          isMine: true,
        });

        addOrUpdateContact(pubkey, {
          lastMessage: content,
          lastMessageAt: Math.floor(Date.now() / 1000),
        });

        return true;
      } catch (error) {
        console.error("Send error:", error);
        toast.error("Failed to send message.");
        return false;
      }
    },
    [ndk, currentUser, addMessage, addOrUpdateContact],
  );

  useEffect(() => {
    if (!ndk || !currentUser || !activeContact) return;

    const contactMessages = messages[activeContact];
    if (!contactMessages) return;

    const pending = contactMessages.filter((msg) =>
      msg.content.includes("?iv="),
    );
    if (pending.length === 0) return;

    console.log("[chat] Retrying", pending.length, "pending messages");

    const processPending = async () => {
      for (const msg of pending) {
        try {
          const counterpartyPubkey = msg.isMine ? activeContact : msg.pubkey;
          const event = new NDKEvent(ndk, {
            kind: DM_KIND,
            id: msg.id,
            pubkey: msg.pubkey,
            content: msg.content,
            created_at: msg.createdAt,
            tags: msg.isMine ? [["p", activeContact]] : [],
          });

          const counterparty = ndk.getUser({ pubkey: counterpartyPubkey });
          const signer = ndk.signer;
          if (!signer) continue;

          await event.decrypt(counterparty, signer, "nip04");
          updateMessageContent(activeContact, msg.id, event.content);
          console.log("[chat] Pending decrypted:", msg.id);
        } catch (e) {
          console.warn("[chat] Pending decrypt failed:", msg.id, e);
        }
      }
    };

    processPending();
  }, [ndk, currentUser, activeContact, messages, updateMessageContent]);

  useEffect(() => {
    if (!ndk || !currentUser) {
      subscriptionRef.current?.stop();
      subscriptionRef.current = null;
      return;
    }

    fetchConversations();

    const filter: NDKFilter = {
      kinds: [DM_KIND],
      "#p": [currentUser.pubkey],
      since: Math.floor(Date.now() / 1000),
    };

    const sub = ndk.subscribe(filter, { closeOnEose: false });

    sub.on("event", async (event: NDKEvent) => {
      const otherPubkey = event.pubkey;
      if (otherPubkey === currentUser.pubkey) return;

      try {
        const decrypted = await decryptEvent(event);

        addMessage(otherPubkey, {
          id: event.id,
          pubkey: otherPubkey,
          content: event.content,
          createdAt: event.created_at || 0,
          isMine: false,
        });

        addOrUpdateContact(otherPubkey);

        if (!decrypted) {
          console.warn("[chat] Incoming remains encrypted:", event.id);
        }

        try {
          const user = ndk.getUser({ pubkey: otherPubkey });
          const profile = await user.fetchProfile();
          if (profile) setContactProfile(otherPubkey, profile);
        } catch (e) {
          console.error("Profile fetch error:", e);
        }
      } catch (error) {
        console.error("Incoming message error:", error);
      }
    });

    subscriptionRef.current = sub;

    return () => {
      sub.stop();
      subscriptionRef.current = null;
    };
  }, [
    ndk,
    currentUser,
    fetchConversations,
    addMessage,
    addOrUpdateContact,
    setContactProfile,
    decryptEvent,
  ]);

  return {
    sendMessage,
    fetchConversations,
    activeContactMessages: activeContact ? messages[activeContact] || [] : [],
  };
}
