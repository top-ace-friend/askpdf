"use client";

import { cn } from "@/lib/utils";
import { Clipboard, Check } from "lucide-react";
import { FunctionComponent } from "react";
import TooltipButton from "../ui/tooltip-button";
import { Message } from "ai";

interface UserMessageProps {
  message: Message;
  copiedMessageId: string | null;
  onCopy: (text: string, messageId: string) => void;
}

const UserMessage: FunctionComponent<UserMessageProps> = ({
  message,
  copiedMessageId,
  onCopy,
}) => {
  return (
    <div className="flex justify-end relative group pb-7">
      <div
        className={cn(
          "flex flex-col gap-2 rounded-md px-3 py-1.5 relative bg-purple-custom-200 dark:bg-purple-custom-800 dark:text-neutral-200"
        )}
      >
        <p>{message.content}</p>
      </div>
      <div className={cn("absolute bottom-0 right-0 group-hover:block hidden")}>
        <TooltipButton
          icon={copiedMessageId === message.id ? Check : Clipboard}
          tooltipText="Copy"
          onClick={() => onCopy(message.content, message.id)}
        />
      </div>
    </div>
  );
};

export default UserMessage;
