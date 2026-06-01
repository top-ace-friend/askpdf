"use client";

import { Loader2 } from "lucide-react";
import { FunctionComponent, useEffect, useState } from "react";
import UserMessage from "./user-message";
import AssistantMessage from "./assistant-message";
import { UIMessage } from "ai";
import {
  getMessageContent,
  getMessageSources,
  getMessageModel,
} from "@/lib/message-utils";

interface MessageListProps {
  messages: UIMessage[];
  chatId: string;
  isLoading: boolean;
  isWaitingForResponse: boolean;
  isResponding: boolean;
  pdfName?: string;
}

const MessageList: FunctionComponent<MessageListProps> = ({
  messages,
  isLoading,
  isWaitingForResponse = false,
  isResponding = false,
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

  // Welcome message component
  const WelcomeMessage = () => (
    <AssistantMessage
      message={{
        id: "welcome-message",
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "Remember to add the API keys in the settings.\n\nGet started by asking a question about your document.",
          },
        ],
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
              sources={getMessageSources(m)}
              model={getMessageModel(m)}
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
