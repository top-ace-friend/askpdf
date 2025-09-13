import { retrieval } from "@/lib/langchain/retrieval";
import { Message } from "ai";
import { NextResponse } from "next/server";
import { VALID_MODELS } from "@/constants/models";
import { logger } from "@lib/logger";

export const runtime = "edge";

function validateModel(selectedModel?: string): string | undefined {
  if (!selectedModel) return undefined;
  return VALID_MODELS.includes(selectedModel) ? selectedModel : undefined;
}

const formatMessages = (messages: Message[]) => {
  const formattedMessages = messages.map(
    (message) =>
      `${message.role === "user" ? "Human" : "Assistant"}: ${message.content}`
  );
  return formattedMessages.join("/n");
};

export async function POST(req: Request) {
  try {
    const { messages, fileKey, chatId, selectedModel, apiKeys, localChunks } =
      await req.json();

    const currentMessageContent = messages[messages.length - 1].content;
    const previousMessages = messages.slice(0, -1);
    const chatHistory = formatMessages(previousMessages);

    // Validate the selected model
    const validatedModel = validateModel(selectedModel);
    if (selectedModel && !validatedModel) {
      logger.warn(`Invalid model received: ${selectedModel}. Using default.`);
    }

    let sources: { content: string; pageNumber: number }[] = [];

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
          sources = documents.map((d) => ({
            content: d.pageContent,
            pageNumber: d.metadata.pageNumber,
          }));
        },
        handleLLMEnd: async (output) => {
          // In open source version, message storage is handled client-side
          // No database operations needed here
          logger.debug("Chat completion generated successfully");
        },
      },
    });

    // Return a StreamingTextResponse, which can be consumed by the client
    return streamingtextResponse;
  } catch (err) {
    logger.error("Error generating reply:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
