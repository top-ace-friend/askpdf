"use client";

import { FunctionComponent, useEffect, useState } from "react";
import { useChat } from "ai/react";
import { Loader2, CornerDownRight } from "lucide-react";
import { LocalChat, LocalMessage } from "@/store/app-store";
import { Button } from "./ui/button";
import MessageList from "./messages/message-list";
import { Textarea } from "./ui/textarea";
import ModelSelector from "./model-selector";
import { useAppStore } from "@store/app-store";
import toast from "react-hot-toast";
import { logger } from "@lib/logger";

interface ChatInterfaceProps {
  currentChat: LocalChat;
}

const ChatInterface: FunctionComponent<ChatInterfaceProps> = ({
  currentChat,
}) => {
  const chatId = currentChat.id;
  const { getMessages, addMessage, selectedModel, apiKeys, getChunks } =
    useAppStore();

  // Get messages from local store instead of API
  const chatMessages = getMessages(chatId);

  const query = {
    data: { messages: chatMessages, sources: [] },
    isLoading: false,
    error: null,
  };

  const [sourcesForMessages, setSourcesForMessages] = useState<
    Record<string, any>
  >({});
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [modelForMessages, setModelForMessages] = useState<
    Record<string, string>
  >({});
  const [keywordsForMessages, setKeywordsForMessages] = useState<
    Record<string, string[]>
  >({});

  // Get chunks for the current file
  const localChunks = getChunks(currentChat.fileKey);

  const { messages, input, isLoading, handleInputChange, handleSubmit } =
    useChat({
      body: {
        fileKey: currentChat.fileKey,
        chatId,
        selectedModel,
        apiKeys,
        localChunks,
      },
      initialMessages:
        chatMessages.map((msg) => ({
          id: msg.id,
          content: msg.content,
          role: msg.role as "user" | "assistant",
          createdAt: new Date(msg.createdAt),
        })) || [],
      onResponse: (response) => {
        const sourcesHeader = response.headers.get("x-sources");
        const sources = sourcesHeader ? JSON.parse(atob(sourcesHeader)) : [];
        const messageIndexHeader = response.headers.get("x-message-index");
        const modelHeader = response.headers.get("x-model");
        const keywordsHeader = response.headers.get("x-keywords");

        if (messageIndexHeader) {
          if (sources.length) {
            setSourcesForMessages({
              ...sourcesForMessages,
              [messageIndexHeader]: sources,
            });
          }

          // Store the selected model for the new AI message
          if (modelHeader) {
            setModelForMessages((prev) => ({
              ...prev,
              [messageIndexHeader]: modelHeader,
            }));
          }

          // Store extracted keywords for debugging/display
          if (keywordsHeader) {
            try {
              const keywords = JSON.parse(atob(keywordsHeader));
              setKeywordsForMessages((prev) => ({
                ...prev,
                [messageIndexHeader]: keywords,
              }));
              logger.info("Keywords used for search:", keywords);
            } catch (error) {
              logger.warn("Failed to parse keywords header:", error);
            }
          }
        }

        setIsWaitingForResponse(false);
      },
      onError: (error) => {
        toast.error("Something went wrong", {
          position: "bottom-right",
          duration: 5000,
        });
      },
      onFinish: (message) => {
        // Save the message to local store
        const newMessage: LocalMessage = {
          id: crypto.randomUUID(),
          chatId: chatId,
          content: message.content,
          createdAt: new Date().toISOString(),
          role: "system",
          model: selectedModel,
        };
        addMessage(newMessage);
      },
    });

  // Chat ID is handled by the parent component

  // Extract model information from database messages
  // useEffect(() => {
  //   if (query.data?.messages) {
  //     const modelMap: Record<string, string> = {};
  //     query.data.messages.forEach((msg: any) => {
  //       if (msg.model) {
  //         modelMap[msg.id] = msg.model;
  //       }
  //     });
  //     setModelForMessages(modelMap);
  //   }
  // }, [query.data?.messages]);

  // useEffect(() => {
  //   if (query.data?.sources) {
  //     const msgSources = query.data?.sources
  //       ? (query.data?.sources as { [key: string]: any }[]).reduce(
  //           (a, v) => ({ ...a, [v.messageId]: v.data }),
  //           {}
  //         )
  //       : {};
  //     setSourcesForMessages(msgSources);
  //   }
  // }, [query.data?.sources]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // Save user message to local store first
    if (input.trim()) {
      const userMessage: LocalMessage = {
        id: crypto.randomUUID(),
        chatId: chatId,
        content: input,
        createdAt: new Date().toISOString(),
        role: "user",
      };
      addMessage(userMessage);
    }

    setIsWaitingForResponse(true);
    handleSubmit(e);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      onSubmit(e as any);
    }
  };

  return (
    <>
      <div className="relative w-full h-[calc(100vh-72px)] flex flex-col justify-between bg-neutral-50 dark:bg-neutral-900 rounded-md">
        <MessageList
          messages={messages}
          isLoading={query.isLoading}
          isWaitingForResponse={isWaitingForResponse}
          isResponding={isLoading}
          // sources={sourcesForMessages}
          models={modelForMessages}
          chatId={chatId}
          pdfName={currentChat.pdfName}
        />
        <form
          className={`flex gap-3 bg-neutral-50 dark:bg-neutral-900 px-3 pt-1 pb-5`}
          onSubmit={onSubmit}
        >
          {/* Chat input container */}
          <div className="flex flex-col items-end w-full border border-neutral-300 dark:border-neutral-700 rounded-lg">
            <Textarea
              value={input}
              placeholder="Ask any question..."
              rows={2}
              disabled={isLoading}
              onChange={handleInputChange}
              onKeyDown={onKeyDown}
              className="pt-2.5 border-none resize-none bg-transparent"
            />
            {/* Bottom row with model selector and send button */}
            <div className="flex items-center justify-between w-full pb-2">
              {/* Model selector on the left */}
              <ModelSelector className="ml-3" />

              {/* Send button on the right */}
              <Button
                type="submit"
                variant="ghost"
                className="w-fit gap-1 font-light text-[12px] text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-400 hover:bg-transparent"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <CornerDownRight size={16} />
                    Enter to send
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

export default ChatInterface;
