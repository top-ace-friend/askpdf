"use client";

import { Loader2 } from "lucide-react";
import { FunctionComponent, useEffect, useState } from "react";
import UserMessage from "./user-message";
import AssistantMessage from "./assistant-message";
import { Message } from "ai";

interface MessageListProps {
  messages: Message[];
  chatId: string;
  isLoading: boolean;
  isWaitingForResponse: boolean;
  isResponding: boolean;
  sources?: Record<string, any>;
  models?: Record<string, string>;
  pdfName?: string;
}

const MessageList: FunctionComponent<MessageListProps> = ({
  messages,
  isLoading,
  isWaitingForResponse = false,
  isResponding = false,
  sources,
  models,
  pdfName,
}) => {
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const handleCopy = (text: string, chatId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(chatId);
    setTimeout(() => {
      setCopiedMessageId(null);
    }, 1000);
  };

  useEffect(() => {
    const messageContainer = document.getElementById("message-list");
    if (messageContainer) {
      messageContainer.scrollTo({
        top: messageContainer.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isWaitingForResponse]);

  if (isLoading) {
    return (
      <div className="h-full flex justify-center items-center">
        <Loader2
          size={30}
          className="text-neutral-400 dark:text-neutral-600 animate-spin"
        />
      </div>
    );
  }

  // in markdown format
  const welcomeMessage = `
  Your file **${pdfName?.split(".")[0]}** has been successfully processed.
  
  I can help you with:
  - Answering questions about the document content
  - Summarizing the whole document or specific sections
  - Finding relevant information quickly
  - Explaining complex concepts from the document

  Let's dive in!
  `;

  // Welcome message component
  const WelcomeMessage = () => (
    <AssistantMessage
      message={{
        id: "welcome-message",
        content: welcomeMessage,
        role: "assistant",
      }}
      copiedMessageId={null}
    />
  );

  return (
    <div
      className="flex flex-col p-6 h-full overflow-y-auto no-scrollbar"
      id="message-list"
    >
      {/* Show welcome message if no messages exist */}
      {messages.length === 0 && <WelcomeMessage />}

      {messages.map((m, i) => (
        <div key={m.id}>
          {m.role === "user" ? (
            <UserMessage
              message={m}
              copiedMessageId={copiedMessageId}
              onCopy={handleCopy}
            />
          ) : (
            <AssistantMessage
              message={m}
              copiedMessageId={copiedMessageId}
              onCopy={handleCopy}
              sources={sources && (sources[m.id] ?? sources[i])}
              model={models && (models[m.id] ?? models[i])}
              isResponding={isResponding && i === messages.length - 1}
            />
          )}
        </div>
      ))}

      {/* Loading placeholder when AI is responding */}
      {isWaitingForResponse && (
        <div className="flex justify-start">
          <div className="flex flex-col items-end gap-2 rounded-md px-3 py-1.5">
            <div className="flex items-center gap-2">
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-neutral-500 dark:bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1 h-1 bg-neutral-500 dark:bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1 h-1 bg-neutral-500 dark:bg-neutral-400 rounded-full animate-bounce"></div>
              </div>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                AI is thinking
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageList;
