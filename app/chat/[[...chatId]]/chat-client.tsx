"use client";

import ChatInterface from "@components/chat-interface";
import PdfViewer from "@components/pdf-viewer";
import { LocalChat, useAppStore } from "@store/app-store";
import ChatFile from "@components/chat-file";
import { useEffect } from "react";

interface ChatClientProps {
  chatId: string;
}

export default function ChatClient({ chatId }: ChatClientProps) {
  const { chats, setCurrentChatId } = useAppStore();

  useEffect(() => {
    setCurrentChatId(chatId);
  }, [chatId, setCurrentChatId]);

  const getCurrentChat = (chats: LocalChat[], chatId: string) => {
    return chatId ? chats.find((chat: LocalChat) => chat.id === chatId) : null;
  };

  const currentChat = getCurrentChat(chats, chatId);

  return (
    <>
      {currentChat ? (
        <>
          <PdfViewer fileKey={currentChat.fileKey} />
          <ChatInterface currentChat={currentChat} />
        </>
      ) : (
        <ChatFile />
      )}
    </>
  );
}
