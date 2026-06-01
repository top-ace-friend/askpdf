import { LocalChat } from "@/store/app-store";

// These functions are now client-side only since we use localStorage
// Server actions are no longer needed for the open source version

export const getCurrentChat = (chats: LocalChat[], chatId: string) => {
  return chatId ? chats.find((chat: LocalChat) => chat.id === chatId) : null;
};
