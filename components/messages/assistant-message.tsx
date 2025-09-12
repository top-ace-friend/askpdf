"use client";

import { cn } from "@/lib/utils";
import { Providers } from "@/types";
import { Clipboard, Check } from "lucide-react";
import { FunctionComponent } from "react";
import TooltipButton from "../ui/tooltip-button";
import SourcesDialog from "../dialogs/sources-dialog";
import Markdown from "markdown-to-jsx";
import { CodeComponent } from "./code-component";
import { MODEL_OPTIONS } from "@constants/models";
import { flatten } from "lodash";
import { AskPdfIcon } from "../icons/askpdf-icon";
import { ClaudeIcon } from "@components/icons/claude-icon";
import { DeepSeekIcon } from "@components/icons/deepseek-icon";
import { GeminiIcon } from "@components/icons/gemini-icon";
import { OpenAIIcon } from "@components/icons/openai-icon";
import { Message } from "ai";

interface AssistantMessageProps {
  message: Message;
  messageIndex: number;
  copiedMessageId: string | null;
  onCopy: (text: string, messageId: string) => void;
  sources?: any;
  model?: string;
}

const AssistantMessage: FunctionComponent<AssistantMessageProps> = ({
  message,
  messageIndex,
  copiedMessageId,
  onCopy,
  sources,
  model,
}) => {
  const getModelProviderIcon = (provider: Providers) => {
    switch (provider) {
      case Providers.OpenAI:
        return <OpenAIIcon size={15} />;
      case Providers.Anthropic:
        return <ClaudeIcon size={15} />;
      case Providers.Google:
        return <GeminiIcon size={15} />;
      case Providers.DeepSeek:
        return <DeepSeekIcon size={15} />;
    }
  };

  const getModelInfo = (model: string | undefined) => {
    const modelInfo = {
      name: "AskPDF Assistant",
      icon: <AskPdfIcon size={17} />,
    };
    if (!model) {
      return modelInfo;
    }
    const options = flatten(Object.values(MODEL_OPTIONS));
    for (const option of options) {
      if (option.value === model) {
        return {
          name: option.label,
          icon: getModelProviderIcon(option.provider as Providers),
        };
      }
    }
    return modelInfo;
  };

  const modelInfo = getModelInfo(model);

  return (
    <div className="flex flex-col gap-2 justify-start mb-3">
      <div className="flex items-center gap-1.5">
        {modelInfo.icon}
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
          {modelInfo.name}
        </p>
      </div>
      <div className={cn("flex flex-col gap-2 dark:text-neutral-300 relative")}>
        <Markdown
          options={{
            overrides: {
              ...markdownOptions,
              code: CodeComponent,
            },
          }}
        >
          {message.content}
        </Markdown>
        <div className="flex gap-3">
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

const markdownOptions = {
  h1: {
    props: {
      className: "text-2xl font-semibold my-2 first:mt-0",
    },
  },
  h2: {
    props: {
      className: "text-xl font-semibold my-2 first:mt-0",
    },
  },
  h3: {
    props: {
      className: "text-lg font-semibold my-2 first:mt-0",
    },
  },
  h4: {
    props: {
      className: "text-base font-semibold my-2 first:mt-0",
    },
  },
  h5: {
    props: {
      className: "text-sm font-semibold my-2 first:mt-0",
    },
  },
  h6: {
    props: {
      className: "text-xs font-semibold my-2 first:mt-0",
    },
  },
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
};
