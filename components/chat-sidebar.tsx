"use client";

import { MessageSquarePlus, Trash } from "lucide-react";
import { Button } from "./ui/button";
import { LocalChat } from "@/store/app-store";
import { useRouter } from "next/navigation";
import { MouseEventHandler, useState } from "react";
import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAppStore } from "@store/app-store";
import dayjs from "dayjs";
import { cn } from "@lib/utils";
import DeleteChatDialog from "./dialogs/delete-chat-dialog";

interface ChatSideBarProps {}

const ChatSideBar = ({}: ChatSideBarProps) => {
  const router = useRouter();
  const { chats, currentChatId, setCurrentChatId, removeChat } = useAppStore();

  const [removingChatId, setRemovingChatId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<LocalChat | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: async (chat: LocalChat) => {
      const response = await axios.post("/api/remove-messages", {
        chatId: chat.id,
        fileKey: chat.fileKey,
      });
      return response.data;
    },
  });

  const handleNewChat = () => {
    setCurrentChatId("");
    router.push("/chat");
  };

  const handleSelectChat = (chat: LocalChat) => {
    if (isPending && removingChatId === chat.id) return;

    setCurrentChatId(chat.id);
    router.push(`/chat/${chat.id}`);
  };

  const handleRemoveChat = (
    e: React.MouseEvent<HTMLButtonElement>,
    chat: LocalChat
  ) => {
    e.stopPropagation();
    setChatToDelete(chat);
    setShowDeleteDialog(true);
  };

  const confirmDeleteChat = () => {
    if (!chatToDelete) return;

    setRemovingChatId(chatToDelete.id);
    setShowDeleteDialog(false);

    mutate(chatToDelete, {
      onSuccess: ({ chatId }: { chatId: string }) => {
        toast.success("Delete chat successfully");
        removeChat(chatId);
        setRemovingChatId(null);
        setChatToDelete(null);
        if (chatId === currentChatId) {
          router.push("/chat");
        }
      },
      onError: () => {
        toast.error("Error deleting chat");
        setRemovingChatId(null);
        setChatToDelete(null);
      },
    });
  };

  const cancelDeleteChat = () => {
    setShowDeleteDialog(false);
    setChatToDelete(null);
  };

  return (
    <div className="w-72 h-full shrink-0 bg-neutral-50 dark:bg-neutral-900 px-4 py-5 flex flex-col justify-between rounded-md mr-1">
      <div>
        <NewChatButton onClick={handleNewChat} />
        {
          <div className="w-full mt-3 flex flex-col gap-2">
            {chats.map((chat) => {
              const selected = chat.id === currentChatId;
              return (
                <li
                  key={chat.id}
                  className={cn(
                    "w-full group flex justify-between gap-2 items-center p-3 rounded-md text-neutral-500",
                    {
                      // Selected state
                      "bg-purple-custom-50 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300":
                        selected,
                      // Normal hover state (only when not deleting)
                      "cursor-pointer hover:bg-purple-custom-50 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-neutral-300":
                        !(isPending && removingChatId === chat.id),
                      // Deleting state
                      "animate-pulse cursor-not-allowed":
                        isPending && removingChatId === chat.id,
                    }
                  )}
                  onClick={() => handleSelectChat(chat)}
                >
                  <div className="flex items-center gap-1 w-full">
                    <div className="flex flex-col w-full">
                      <p className="truncate">{chat.pdfName}</p>
                      <p className="text-xs text-neutral-400 dark:text-neutral-500">
                        {dayjs(chat.createdAt).format("DD MMM YYYY")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      className={cn(
                        "group-hover:block hidden h-fit shrink-0 p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300",
                        {
                          "group-hover:hidden":
                            isPending && removingChatId === chat.id,
                        }
                      )}
                      disabled={isPending}
                      onClick={(e) => handleRemoveChat(e, chat)}
                    >
                      <Trash size={14} />
                    </Button>
                  </div>
                </li>
              );
            })}
          </div>
        }
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteChatDialog
        showDeleteDialog={showDeleteDialog}
        setShowDeleteDialog={setShowDeleteDialog}
        pdfName={chatToDelete?.pdfName || ""}
        cancelDeleteChat={cancelDeleteChat}
        confirmDeleteChat={confirmDeleteChat}
        isPending={isPending}
      />
    </div>
  );
};

export default ChatSideBar;

interface NewChatButtonProps {
  onClick: MouseEventHandler<HTMLButtonElement>;
}

const NewChatButton = ({ onClick }: NewChatButtonProps) => {
  return (
    <Button variant="outline" className="w-full" onClick={onClick}>
      <MessageSquarePlus size={20} className="mr-1.5" />
      New chat
    </Button>
  );
};
