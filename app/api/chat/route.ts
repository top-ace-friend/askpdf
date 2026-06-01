import { retrieval } from "@/lib/langchain/retrieval";
import { NextResponse } from "next/server";
import { VALID_MODELS } from "@/constants/models";
import { logger } from "@lib/logger";
import { getMessageContent } from "@/lib/message-utils";
import { toUIMessageStream } from "@ai-sdk/langchain";
import { createUIMessageStreamResponse, UIMessage } from "ai";

export const runtime = "edge";

function validateModel(selectedModel?: string): string | undefined {
  if (!selectedModel) return undefined;
  return VALID_MODELS.includes(selectedModel) ? selectedModel : undefined;
}

const formatMessages = (messages: UIMessage[]) => {
  const formattedMessages = messages.map(
    (message) =>
      `${message.role === "user" ? "Human" : "Assistant"}: ${getMessageContent(
        message
      )}`
  );
  return formattedMessages.join("/n");
};

export async function POST(req: Request) {
  try {
    const { messages, fileKey, selectedModel, apiKeys, localChunks } =
      await req.json();

    const currentMessageContent = getMessageContent(
      messages[messages.length - 1]
    );
    const previousMessages = messages.slice(0, -1);
    const chatHistory = formatMessages(previousMessages);

    // Validate the selected model
    const validatedModel = validateModel(selectedModel);
    if (selectedModel && !validatedModel) {
      logger.warn(`Invalid model received: ${selectedModel}. Using default.`);
    }

    let sources: string = "";

    const streamingtextResponse = await retrieval({
      question: currentMessageContent,
      chatHistory,
      previousMessages,
      fileKey,
      selectedModel: validatedModel,
      apiKeys,
      localChunks,
      streamCallbacks: {
        handleRetrieverEnd: (documents) => {
          sources = Buffer.from(
            JSON.stringify(
              documents.map((document) => document.metadata.pageNumber)
            )
          ).toString("base64");
        },
        handleLLMEnd: async (output) => {
          // In open source version, message storage is handled client-side
          // No database operations needed here
          logger.debug("Chat completion generated successfully");
        },
      },
    });

    // Convert LangChain stream to AI SDK v5 format
    return createUIMessageStreamResponse({
      stream: toUIMessageStream(streamingtextResponse),
      headers: {
        "x-model-name": selectedModel || "",
        "x-sources": sources,
      },
    });
  } catch (err) {
    logger.error("Error generating reply:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
