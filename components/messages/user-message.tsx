"use client";

import { cn } from "@/lib/utils";
import { Clipboard, Check } from "lucide-react";
import { FunctionComponent } from "react";
import TooltipButton from "../ui/tooltip-button";
import { UIMessage } from "ai";
import { getMessageContent } from "@/lib/message-utils";

interface UserMessageProps {
  message: UIMessage;
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
        <p>{getMessageContent(message)}</p>
      </div>
      <div className={cn("absolute bottom-0 right-0 group-hover:block hidden")}>
        <TooltipButton
          icon={copiedMessageId === message.id ? Check : Clipboard}
          tooltipText="Copy"
          onClick={() => onCopy(getMessageContent(message), message.id)}
        />
      </div>
    </div>
  );
};

export default UserMessage;
