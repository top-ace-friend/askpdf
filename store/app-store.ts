import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { DEFAULT_MODEL } from "@/constants/models";
import { ApiKeys } from "@/types";
import { logger } from "@lib/logger";
import { fileStorage } from "@/lib/file-storage";

// Local types for open source version (no database)
export interface LocalChat {
  id: string;
  pdfName: string;
  createdAt: string;
  fileKey: string;
}

export interface LocalMessage {
  id: string;
  chatId: string;
  content: string;
  createdAt: string;
  role: "system" | "user" | "assistant";
  model?: string;
}

export interface DocumentChunk {
  id: string;
  fileKey: string;
  content: string;
  pageNumber: number;
  chunkIndex: number;
}

// LocalStorage keys
const STORAGE_KEYS = {
  API_KEYS: "askpdf-api-keys",
  CHATS: "askpdf-chats",
  MESSAGES: "askpdf-messages",
};

// Utility functions for localStorage
const saveApiKeysToStorage = (apiKeys: ApiKeys) => {
  try {
    localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(apiKeys));
  } catch (error) {
    logger.error("Error saving API keys:", error);
  }
};

const loadApiKeysFromStorage = (): ApiKeys => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.API_KEYS);
    if (!stored) return {};
    return JSON.parse(stored);
  } catch (error) {
    logger.error("Error loading API keys:", error);
    return {};
  }
};

// Cache for blob URLs to avoid recreating them
const blobUrlCache = new Map<string, string>();

// Utility function to create blob URL from IndexedDB file
const createBlobUrlFromFile = async (
  fileKey: string
): Promise<string | null> => {
  try {
    // Check cache first
    if (blobUrlCache.has(fileKey)) {
      return blobUrlCache.get(fileKey)!;
    }

    const blob = await fileStorage.getFileBlob(fileKey);
    if (blob) {
      const blobUrl = URL.createObjectURL(blob);
      blobUrlCache.set(fileKey, blobUrl);
      return blobUrl;
    }
    return null;
  } catch (error) {
    logger.error("Error creating blob URL:", error);
    return null;
  }
};

// Clean up blob URL from cache
const releaseBlobUrl = (fileKey: string) => {
  const blobUrl = blobUrlCache.get(fileKey);
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl);
    blobUrlCache.delete(fileKey);
  }
};

type AppStore = {
  chats: LocalChat[];
  messages: LocalMessage[];
  chunks: DocumentChunk[];
  currentChatId: string;
  selectedModel: string;
  apiKeys: ApiKeys;
  addChat: (chat: LocalChat) => void;
  removeChat: (chatId: string) => void;
  setCurrentChatId: (currentChatId: string) => void;
  setSelectedModel: (model: string) => void;
  setApiKeys: (apiKeys: ApiKeys) => void;
  addMessage: (message: LocalMessage) => void;
  getMessages: (chatId: string) => LocalMessage[];
  removeMessagesForChat: (chatId: string) => void;
  addChunks: (chunks: DocumentChunk[]) => void;
  getChunks: (fileKey: string) => DocumentChunk[];
  removeChunks: (fileKey: string) => void;
  searchChunks: (
    fileKey: string,
    query: string,
    maxResults?: number
  ) => DocumentChunk[];
  initializeStore: () => void;
  getBlobUrlForChat: (fileKey: string) => Promise<string | null>;
};

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, get) => ({
        chats: [],
        messages: [],
        chunks: [],
        currentChatId: "",
        selectedModel: DEFAULT_MODEL,
        apiKeys: {},

        addChat: (chat) =>
          set((state) => ({
            chats: [chat, ...state.chats],
          })),

        removeChat: (chatId) =>
          set((state) => {
            const chatToRemove = state.chats.find((chat) => chat.id === chatId);

            if (chatToRemove) {
              // Clean up file storage and blob URL cache
              fileStorage.deleteFile(chatToRemove.fileKey).catch((error) => {
                logger.error("Error deleting file from storage:", error);
              });
              releaseBlobUrl(chatToRemove.fileKey);
            }

            return {
              chats: state.chats.filter((chat) => chat.id !== chatId),
              messages: state.messages.filter((msg) => msg.chatId !== chatId),
              chunks: chatToRemove
                ? state.chunks.filter(
                    (chunk) => chunk.fileKey !== chatToRemove.fileKey
                  )
                : state.chunks,
              currentChatId:
                state.currentChatId === chatId ? "" : state.currentChatId,
            };
          }),

        setCurrentChatId: (currentChatId) => set({ currentChatId }),

        setSelectedModel: (model) => set({ selectedModel: model }),

        setApiKeys: (apiKeys) => {
          saveApiKeysToStorage(apiKeys);
          set({ apiKeys });
        },

        addMessage: (message) =>
          set((state) => ({
            messages: [...state.messages, message],
          })),

        getMessages: (chatId) => {
          const state = get();
          return state.messages.filter((msg) => msg.chatId === chatId);
        },

        removeMessagesForChat: (chatId) =>
          set((state) => ({
            messages: state.messages.filter((msg) => msg.chatId !== chatId),
          })),

        addChunks: (chunks) =>
          set((state) => ({
            chunks: [...state.chunks, ...chunks],
          })),

        getChunks: (fileKey) => {
          const state = get();
          return state.chunks.filter((chunk) => chunk.fileKey === fileKey);
        },

        removeChunks: (fileKey) =>
          set((state) => ({
            chunks: state.chunks.filter((chunk) => chunk.fileKey !== fileKey),
          })),

        searchChunks: (fileKey, query, maxResults = 5) => {
          const state = get();
          const fileChunks = state.chunks.filter(
            (chunk) => chunk.fileKey === fileKey
          );

          if (!query.trim()) {
            return fileChunks.slice(0, maxResults);
          }

          // Simple keyword-based search (can be enhanced with better similarity)
          const queryLower = query.toLowerCase();
          const scoredChunks = fileChunks.map((chunk) => {
            const contentLower = chunk.content.toLowerCase();
            const words = queryLower.split(/\s+/);
            let score = 0;

            // Count keyword matches
            words.forEach((word) => {
              if (contentLower.includes(word)) {
                score += 1;
              }
            });

            // Boost score for exact phrase matches
            if (contentLower.includes(queryLower)) {
              score += 2;
            }

            return { chunk, score };
          });

          // Sort by score and return top results
          return scoredChunks
            .filter(({ score }) => score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults)
            .map(({ chunk }) => chunk);
        },

        initializeStore: () => {
          const storedApiKeys = loadApiKeysFromStorage();
          set({ apiKeys: storedApiKeys });
        },

        getBlobUrlForChat: async (fileKey: string) => {
          return createBlobUrlFromFile(fileKey);
        },
      }),
      {
        name: "askpdf-store",
        partialize: (state) => ({
          chats: state.chats,
          messages: state.messages,
          chunks: state.chunks,
          selectedModel: state.selectedModel,
        }),
      }
    ),
    {
      name: "app-store",
      enabled: process.env.NODE_ENV !== "production",
    }
  )
);

// Export types for use in other components
export type { ApiKeys };
