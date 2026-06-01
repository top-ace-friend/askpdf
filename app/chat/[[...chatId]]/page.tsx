import ChatClient from "./chat-client";
interface ChatPageProps {
  params: Promise<{
    chatId: string[];
  }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const chatId = (await params).chatId?.[0] || "";

  return <ChatClient chatId={chatId} />;
}
