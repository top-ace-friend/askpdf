import ChatSideBar from "@components/chat-sidebar";
import Header from "@components/header";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-screen h-screen flex flex-col bg-purple-custom-50 dark:bg-neutral-950">
      <Header />
      <main className="w-full h-full flex gap-1 p-2">
        <ChatSideBar />
        {children}
      </main>
    </div>
  );
}
