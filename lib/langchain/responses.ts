import { CallbackHandlerMethods } from "@langchain/core/callbacks/base";
import { CallbackManager } from "@langchain/core/callbacks/manager";
import { BytesOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { logger } from "@lib/logger";
import { ANSWER_TEMPLATE, SIMPLE_CHAT_TEMPLATE } from "@lib/prompts";
import { ApiKeys, DocumentChunk, Source } from "@/types";
import { createStreamingModel } from "./models";
import { Document } from "@langchain/core/documents";
import { createSearchTools, searchLocalChunks } from "./tools";
import { StreamingTextResponse } from "ai";

const answerPrompt = PromptTemplate.fromTemplate(ANSWER_TEMPLATE);
const simpleChatPrompt = PromptTemplate.fromTemplate(SIMPLE_CHAT_TEMPLATE);

export const combineDocumentsFn = (docs: Document[]) => {
  const serializedDocs = docs.map((doc) => doc.pageContent);
  return serializedDocs.join("\n\n");
};

// Helper function to create streaming ReadableStream with data parts embedded
export function createStreamingTextStream(
  stream: ReadableStream,
  customData: {
    sources?: Source[];
    model?: string;
    keywords?: string[];
    messageIndex?: number;
  }
) {
  return new StreamingTextResponse(stream, {
    headers: {
      "x-sources": Buffer.from(JSON.stringify(customData.sources)).toString(
        "base64"
      ),
      "x-model": customData.model || "",
      "x-keywords": Buffer.from(JSON.stringify(customData.keywords)).toString(
        "base64"
      ),
      "x-message-index": customData.messageIndex?.toString() || "",
    },
  });
}

// Intelligent RAG function using AI-powered keyword extraction and search
export async function createIntelligentRAGResponse({
  question,
  chatHistory,
  selectedModel,
  messageCount,
  apiKeys,
  streamCallbacks,
  localChunks,
}: {
  question: string;
  chatHistory: string;
  selectedModel?: string;
  messageCount: number;
  apiKeys: ApiKeys;
  streamCallbacks: CallbackHandlerMethods;
  localChunks: DocumentChunk[];
}) {
  logger.info("Using intelligent RAG mode with AI-powered keyword extraction");

  try {
    // Create search tools
    const tools = createSearchTools(localChunks, selectedModel, apiKeys);

    // Step 1: Extract keywords using AI
    const keywordsResult = await (tools[0] as any).func({
      question,
      chatHistory,
    });

    const keywords = JSON.parse(keywordsResult);

    // Step 2: Search chunks using extracted keywords
    const searchResult = await (tools[1] as any).func({
      keywords: keywordsResult,
      maxResults: 5,
    });

    const searchResults = JSON.parse(searchResult);

    // Convert search results back to DocumentChunk format
    const relevantChunks = searchResults
      .map((result: any) =>
        localChunks.find(
          (chunk) =>
            chunk.chunkIndex === result.chunkIndex &&
            chunk.pageNumber === result.pageNumber
        )
      )
      .filter(Boolean) as DocumentChunk[];

    // Convert chunks to Document format for compatibility
    const documents = relevantChunks.map(
      (chunk) =>
        new Document({
          pageContent: chunk.content,
          metadata: {
            pageNumber: chunk.pageNumber,
            chunkIndex: chunk.chunkIndex,
          },
        })
    );

    // Call the retriever callback to provide sources
    if (streamCallbacks.handleRetrieverEnd) {
      streamCallbacks.handleRetrieverEnd(
        documents,
        "intelligent-local-retrieval",
        undefined,
        []
      );
    }

    // Combine document content
    const context = combineDocumentsFn(documents);

    // Create the chain with context
    const answerChain = RunnableSequence.from([
      answerPrompt,
      createStreamingModel(selectedModel, apiKeys),
      new BytesOutputParser(),
    ]);

    const stream = await answerChain.stream(
      {
        context,
        chat_history: chatHistory,
        question,
      },
      { callbacks: CallbackManager.fromHandlers(streamCallbacks) }
    );

    // Prepare sources for response headers
    const sources = relevantChunks.map((chunk) => ({
      content: chunk.content.substring(0, 1000), // Truncate for header size
      pageNumber: chunk.pageNumber,
    })) as Source[];

    console.log("🎯 Intelligent RAG - Creating response with:", {
      sourcesCount: sources.length,
      model: selectedModel || "",
      keywordsCount: keywords.length,
      messageIndex: messageCount + 1,
    });

    return createStreamingTextStream(stream, {
      sources: sources,
      model: selectedModel || "",
      keywords: keywords,
      messageIndex: messageCount + 1,
    });
  } catch (error) {
    logger.error(
      "Error in intelligent RAG mode, falling back to simple search:",
      error
    );

    // Fallback to simple local RAG if intelligent mode fails
    return createLocalRAGResponse({
      question,
      chatHistory,
      selectedModel,
      messageCount,
      apiKeys,
      streamCallbacks,
      localChunks,
    });
  }
}

// Local RAG function using stored chunks (fallback)
export async function createLocalRAGResponse({
  question,
  chatHistory,
  selectedModel,
  messageCount,
  apiKeys,
  streamCallbacks,
  localChunks,
}: {
  question: string;
  chatHistory: string;
  selectedModel?: string;
  messageCount: number;
  apiKeys: ApiKeys;
  streamCallbacks: CallbackHandlerMethods;
  localChunks: DocumentChunk[];
}) {
  logger.info("Using local RAG mode with stored chunks");

  // Search for relevant chunks
  const relevantChunks = searchLocalChunks(localChunks, question, 5);

  // Convert chunks to Document format for compatibility
  const documents = relevantChunks.map(
    (chunk) =>
      new Document({
        pageContent: chunk.content,
        metadata: {
          pageNumber: chunk.pageNumber,
          chunkIndex: chunk.chunkIndex,
        },
      })
  );

  // Call the retriever callback to provide sources (match the expected signature)
  if (streamCallbacks.handleRetrieverEnd) {
    streamCallbacks.handleRetrieverEnd(
      documents,
      "local-retrieval",
      undefined,
      []
    );
  }

  // Combine document content
  const context = combineDocumentsFn(documents);

  // Create the chain with context
  const answerChain = RunnableSequence.from([
    answerPrompt,
    createStreamingModel(selectedModel, apiKeys),
    new BytesOutputParser(),
  ]);

  const stream = await answerChain.stream(
    {
      context,
      chat_history: chatHistory,
      question,
    },
    { callbacks: CallbackManager.fromHandlers(streamCallbacks) }
  );

  // Prepare sources for response headers
  const sources = relevantChunks.map((chunk) => ({
    content: chunk.content.substring(0, 1000), // Truncate for header size
    pageNumber: chunk.pageNumber,
  }));

  const serializedSources = Buffer.from(JSON.stringify(sources)).toString(
    "base64"
  );

  console.log("🏠 Local RAG - Creating response with:", {
    sourcesCount: sources.length,
    model: selectedModel || "",
    messageIndex: messageCount + 1,
  });

  return createStreamingTextStream(stream, {
    sources: sources,
    model: selectedModel || "",
    messageIndex: messageCount + 1,
  });
}

// Simple chat function without RAG (when no chunks are available)
export async function createSimpleChatResponse({
  question,
  chatHistory,
  selectedModel,
  messageCount,
  apiKeys,
  streamCallbacks,
}: {
  question: string;
  chatHistory: string;
  selectedModel?: string;
  messageCount: number;
  apiKeys: ApiKeys;
  streamCallbacks: CallbackHandlerMethods;
}) {
  logger.info("Using simple chat mode (no RAG) - No chunks available");

  const simpleChain = RunnableSequence.from([
    simpleChatPrompt,
    createStreamingModel(selectedModel, apiKeys),
    new BytesOutputParser(),
  ]);

  const stream = await simpleChain.stream(
    {
      question,
      chat_history: chatHistory,
    },
    { callbacks: CallbackManager.fromHandlers(streamCallbacks) }
  );

  console.log("💬 Simple Chat - Creating response with:", {
    sourcesCount: 0,
    model: selectedModel || "",
    messageIndex: messageCount + 1,
  });

  return createStreamingTextStream(stream, {
    sources: [], // No sources in simple mode
    model: selectedModel || "",
    messageIndex: messageCount + 1,
  });
}
