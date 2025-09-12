"use client";

import { cn } from "@/lib/utils";
import { Message } from "ai";
import { Clipboard, Check } from "lucide-react";
import { FunctionComponent } from "react";
import TooltipButton from "../ui/tooltip-button";
import SourcesDialog from "../dialogs/sources-dialog";
import Markdown from "markdown-to-jsx";
import { CodeComponent } from "./code-component";

interface AssistantMessageProps {
  message: Message;
  messageIndex: number;
  copiedMessageId: string | null;
  onCopy: (text: string, messageId: string) => void;
  sources?: any;
}

const AssistantMessage: FunctionComponent<AssistantMessageProps> = ({
  message,
  messageIndex,
  copiedMessageId,
  onCopy,
  sources,
}) => {
  return (
    <div className="flex justify-start mb-3">
      <div className={cn("flex flex-col gap-2 dark:text-neutral-300 relative")}>
        <Markdown
          options={{
            overrides: {
              p: {
                props: {
                  className: "my-2 last:mb-0 first:mt-0",
                },
              },
              ol: {
                props: {
                  className: "list-decimal pl-5",
                },
              },
              ul: {
                props: {
                  className: "list-disc pl-5",
                },
              },
              li: {
                props: {
                  className: "my-2 last:mb-0 first:mt-0",
                },
              },
              code: CodeComponent,
            },
          }}
        >
          {message.content}
        </Markdown>
        <div className="flex">
          {sources && <SourcesDialog sources={sources} />}
          <TooltipButton
            icon={copiedMessageId === message.id ? Check : Clipboard}
            tooltipText="Copy"
            onClick={() => onCopy(message.content, message.id)}
          />
        </div>
      </div>
    </div>
  );
};

export default AssistantMessage;
