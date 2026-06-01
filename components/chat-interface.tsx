"use client";

import { FunctionComponent, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  getMessageContent,
  getMessageSources,
  getMessageModel,
  getMessageKeywords,
} from "@/lib/message-utils";
import { Loader2, CornerDownRight } from "lucide-react";
import { LocalChat } from "@/store/app-store";
import { Button } from "./ui/button";
import MessageList from "./messages/message-list";
import { Textarea } from "./ui/textarea";
import ModelSelector from "./model-selector";
import { ApiKeys } from "@/types";
import { useAppStore } from "@/store/app-store";
import toast from "react-hot-toast";

interface ChatInterfaceProps {
  currentChat: LocalChat;
  chatId: string;
  selectedModel: string;
  apiKeys: ApiKeys;
}

const ChatInterface: FunctionComponent<ChatInterfaceProps> = ({
  currentChat,
  chatId,
  selectedModel,
  apiKeys,
}) => {
  const { addMessage, getMessages, getChunks } = useAppStore();

  // Get chunks for the current file
  const localChunks = getChunks(currentChat.fileKey);

  const chatMessages = getMessages(chatId);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: {
        fileKey: currentChat.fileKey,
        chatId,
        selectedModel,
        apiKeys,
        localChunks,
      },
    }),
    messages:
      chatMessages.map((msg: any) => ({
        id: msg.id,
        parts: [
          {
            type: "text",
            text: msg.content,
          },
        ],
        role: msg.role as "user" | "assistant",
      })) || [],
    onFinish: (result) => {
      const messageWithContent = {
        id: result.message.id,
        content: getMessageContent(result.message),
        role: result.message.role as "user" | "assistant",
        createdAt: new Date().toISOString(),
        chatId: chatId,
      };

      // Save to store
      addMessage(messageWithContent);

      // Extract custom data from message parts (now embedded directly in the message)
      const sources = getMessageSources(result.message);
      const model = getMessageModel(result.message);
      const keywords = getMessageKeywords(result.message);
    },
    onError: (error) => {
      toast.error(error.message, {
        position: "bottom-right",
        duration: 5000,
      });
    },
  });

  // Handle input state manually
  const [input, setInput] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const userInput = input.trim();
    setInput("");

    if (!userInput || status === "streaming") return;

    const userMessage = {
      id: Date.now().toString(),
      content: userInput,
      role: "user" as const,
      createdAt: new Date().toISOString(),
      chatId: chatId,
    };

    // Save user message to store immediately
    addMessage(userMessage);

    // Send message to API
    await sendMessage({
      parts: [
        {
          type: "text",
          text: input.trim(),
        },
      ],
      role: "user",
    });
  };

  const isLoading = status === "submitted" || status === "streaming";
  const isWaitingForResponse = status === "submitted";
  const isResponding = status === "streaming";

  return (
    <div className="relative w-full h-[calc(100vh-72px)] flex flex-col justify-between bg-neutral-50 dark:bg-neutral-900 rounded-md">
      <MessageList
        messages={messages}
        chatId={chatId}
        isLoading={false}
        isWaitingForResponse={isWaitingForResponse}
        isResponding={isResponding}
        pdfName={currentChat.pdfName}
      />

      <form
        className={`flex gap-3 bg-neutral-50 dark:bg-neutral-900 px-3 pt-1 pb-5`}
        onSubmit={handleSubmit}
      >
        {/* Chat input container */}
        <div className="flex flex-col items-end w-full border border-neutral-300 dark:border-neutral-700 rounded-lg">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask any question..."
            rows={2}
            className="pt-2.5 border-none resize-none bg-transparent"
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
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
  );
};

export default ChatInterface;
