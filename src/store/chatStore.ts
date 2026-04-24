import { create } from "zustand";
import type { NDKUserProfile } from "@nostr-dev-kit/ndk";

export interface ChatContact {
  pubkey: string;
  profile?: NDKUserProfile;
  lastMessage?: string;
  lastMessageAt?: number;
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  pubkey: string;
  content: string;
  createdAt: number;
  isMine: boolean;
}

interface ChatState {
  isOpen: boolean;
  activeContact: string | null;
  contacts: ChatContact[];
  messages: Record<string, ChatMessage[]>;
  setIsOpen: (open: boolean) => void;
  toggleOpen: () => void;
  setActiveContact: (pubkey: string | null) => void;
  addOrUpdateContact: (pubkey: string, updates?: Partial<ChatContact>) => void;
  setContactProfile: (pubkey: string, profile: NDKUserProfile) => void;
  addMessage: (pubkey: string, message: ChatMessage) => void;
  markAsRead: (pubkey: string) => void;
  clearMessages: (pubkey: string) => void;
  updateMessageContent: (
    pubkey: string,
    messageId: string,
    content: string,
  ) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  activeContact: null,
  contacts: [],
  messages: {},

  setIsOpen: (open) => set({ isOpen: open }),

  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

  setActiveContact: (pubkey) => set({ activeContact: pubkey }),

  addOrUpdateContact: (pubkey, updates) =>
    set((state) => {
      const existing = state.contacts.find((c) => c.pubkey === pubkey);
      if (existing) {
        return {
          contacts: state.contacts.map((c) =>
            c.pubkey === pubkey
              ? {
                  ...c,
                  ...updates,
                  lastMessage: updates?.lastMessage ?? c.lastMessage,
                  lastMessageAt: updates?.lastMessageAt ?? c.lastMessageAt,
                }
              : c,
          ),
        };
      }
      return {
        contacts: [
          ...state.contacts,
          {
            pubkey,
            unreadCount: 0,
            ...updates,
          },
        ],
      };
    }),

  setContactProfile: (pubkey, profile) =>
    set((state) => ({
      contacts: state.contacts.map((c) =>
        c.pubkey === pubkey ? { ...c, profile } : c,
      ),
    })),

  addMessage: (pubkey, message) =>
    set((state) => {
      const existing = state.messages[pubkey] || [];
      if (existing.some((m) => m.id === message.id)) {
        return state;
      }

      const newMessages = [...existing, message].sort(
        (a, b) => a.createdAt - b.createdAt,
      );

      const currentContact = state.contacts.find((c) => c.pubkey === pubkey);

      const isNewest =
        !currentContact?.lastMessageAt ||
        message.createdAt >= currentContact.lastMessageAt;

      const contactUpdates: Partial<ChatContact> = {};

      if (isNewest) {
        contactUpdates.lastMessage = message.content;
        contactUpdates.lastMessageAt = message.createdAt;
      }

      if (!message.isMine && state.activeContact !== pubkey) {
        contactUpdates.unreadCount = (currentContact?.unreadCount || 0) + 1;
      }

      const updatedContacts = state.contacts.map((c) =>
        c.pubkey === pubkey ? { ...c, ...contactUpdates } : c,
      );

      if (!currentContact) {
        updatedContacts.push({
          pubkey,
          unreadCount: message.isMine ? 0 : 1,
          lastMessage: message.content,
          lastMessageAt: message.createdAt,
          ...contactUpdates,
        });
      }

      return {
        messages: { ...state.messages, [pubkey]: newMessages },
        contacts: updatedContacts,
      };
    }),

  markAsRead: (pubkey) =>
    set((state) => ({
      contacts: state.contacts.map((c) =>
        c.pubkey === pubkey ? { ...c, unreadCount: 0 } : c,
      ),
    })),

  clearMessages: (pubkey) =>
    set((state) => {
      const { [pubkey]: _, ...rest } = state.messages;
      return { messages: rest };
    }),

  updateMessageContent: (pubkey, messageId, content) =>
    set((state) => {
      const contactMessages = state.messages[pubkey];
      if (!contactMessages) return state;

      const updatedMessages = contactMessages.map((m) =>
        m.id === messageId ? { ...m, content } : m,
      );

      const targetMessage = contactMessages.find((m) => m.id === messageId);
      const currentContact = state.contacts.find((c) => c.pubkey === pubkey);

      let updatedContacts = state.contacts;

      if (
        targetMessage &&
        currentContact &&
        currentContact.lastMessageAt === targetMessage.createdAt
      ) {
        updatedContacts = state.contacts.map((c) =>
          c.pubkey === pubkey ? { ...c, lastMessage: content } : c,
        );
      }

      return {
        messages: { ...state.messages, [pubkey]: updatedMessages },
        contacts: updatedContacts,
      };
    }),
}));
