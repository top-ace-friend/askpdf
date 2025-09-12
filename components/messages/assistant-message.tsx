"use client";

import { cn } from "@/lib/utils";
import { Providers } from "@/types";
import { Clipboard, Check } from "lucide-react";
import { FunctionComponent } from "react";
import TooltipButton from "../ui/tooltip-button";
import SourcesDialog from "../dialogs/sources-dialog";
import { CodeComponent } from "./code-component";
import { MODEL_OPTIONS } from "@constants/models";
import { flatten } from "lodash";
import { AskPdfIcon } from "../icons/askpdf-icon";
import { ClaudeIcon } from "@components/icons/claude-icon";
import { DeepSeekIcon } from "@components/icons/deepseek-icon";
import { GeminiIcon } from "@components/icons/gemini-icon";
import { OpenAIIcon } from "@components/icons/openai-icon";
import { Message } from "ai";
import RemarkMathPlugin from "remark-math";
import rehypeKatex from "rehype-katex";
import ReactMarkdown from "react-markdown";
import React from "react";

interface AssistantMessageProps {
  message: Message;
  copiedMessageId: string | null;
  onCopy?: (text: string, messageId: string) => void;
  sources?: any;
  model?: string;
  isResponding?: boolean;
}

const AssistantMessage: FunctionComponent<AssistantMessageProps> = ({
  message,
  copiedMessageId,
  onCopy,
  sources,
  model,
  isResponding,
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
        <MarkdownRenderer>{message.content}</MarkdownRenderer>
        {!isResponding && (
          <div className="flex gap-3">
            {sources && <SourcesDialog sources={sources} />}
            {onCopy && (
              <TooltipButton
                icon={copiedMessageId === message.id ? Check : Clipboard}
                tooltipText="Copy"
                onClick={() => onCopy(message.content, message.id)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssistantMessage;

const MarkdownRenderer = (props: any) => {
  const newProps = {
    ...props,
    remarkPlugins: [RemarkMathPlugin],
    rehypePlugins: [rehypeKatex],
  };

  // Combine code component with other markdown element styling
  const components = {
    code: CodeComponent,
    h1: ({ children, ...props }: any) => (
      <h1 className="text-2xl font-semibold my-2 first:my-0" {...props}>
        {children}
      </h1>
    ),
    h2: ({ children, ...props }: any) => (
      <h2 className="text-xl font-semibold my-2 first:my-0" {...props}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }: any) => (
      <h3 className="text-lg font-semibold my-2 first:my-0" {...props}>
        {children}
      </h3>
    ),
    h4: ({ children, ...props }: any) => (
      <h4 className="text-base font-semibold my-1.5 first:my-0" {...props}>
        {children}
      </h4>
    ),
    h5: ({ children, ...props }: any) => (
      <h5 className="text-sm font-semibold my-1.5 first:my-0" {...props}>
        {children}
      </h5>
    ),
    h6: ({ children, ...props }: any) => (
      <h6 className="text-xs font-semibold my-1.5 first:my-0" {...props}>
        {children}
      </h6>
    ),
    p: ({ children, ...props }: any) => (
      <p className="my-1 last:mb-0 first:my-0" {...props}>
        {children}
      </p>
    ),
    ol: ({ children, ...props }: any) => (
      <ol className="list-decimal pl-5" {...props}>
        {children}
      </ol>
    ),
    ul: ({ children, ...props }: any) => (
      <ul className="list-disc pl-5" {...props}>
        {children}
      </ul>
    ),
    li: ({ children, ...props }: any) => {
      // Helper function to count KaTeX spans
      const countKatexSpans = (element: any): number => {
        if (!element) return 0;

        let count = 0;

        // Check if current element is a katex span
        if (element.props?.className === "katex") {
          count += 1;
        }

        // Check children recursively
        if (element.props?.children) {
          const childrenArray = React.Children.toArray(element.props.children);
          count += childrenArray.reduce((total: number, child: any) => {
            return total + countKatexSpans(child);
          }, 0);
        }

        return count;
      };

      const katexCount = countKatexSpans({ props: { children } });

      // Apply different styling based on KaTeX count
      if (katexCount === 1) {
        return (
          <li
            className="flex flex-col gap-2 my-2 last:mb-0 first:mt-0"
            {...props}
          >
            {children}
          </li>
        );
      }

      return (
        <li className="my-2 last:mb-0 first:mt-0" {...props}>
          {children}
        </li>
      );
    },
    span: ({ children, ...props }: any) => {
      if (props["aria-hidden"]) {
        return null;
      }

      // Check if span has katex className and apply spacing
      if (
        props.className &&
        typeof props.className === "string" &&
        props.className === "katex"
      ) {
        return (
          <span
            {...props}
            className={`${props.className} text-md my-1 inline-block`}
          >
            {children}
          </span>
        );
      }

      return <span {...props}>{children}</span>;
    },
  };

  return (
    <ReactMarkdown {...newProps} components={components}>
      {props.children}
    </ReactMarkdown>
  );
};
