import { Pinecone } from "@pinecone-database/pinecone";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatDeepSeek } from "@langchain/deepseek";
import { PineconeStore } from "@langchain/pinecone";
import { Document } from "@langchain/core/documents";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import {
  BytesOutputParser,
  StringOutputParser,
} from "@langchain/core/output_parsers";
import { CallbackManager } from "@langchain/core/callbacks/manager";
import { CallbackHandlerMethods } from "@langchain/core/callbacks/base";
import { StreamingTextResponse } from "ai";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import {
  ANSWER_TEMPLATE,
  QUESTION_TEMPLATE,
  SIMPLE_CHAT_TEMPLATE,
  KEYWORD_EXTRACTION_TEMPLATE,
  RAG_TOOL_SYSTEM_TEMPLATE,
} from "./prompts";
import { logger } from "./logger";
import {
  VALID_MODELS,
  DEFAULT_MODEL,
  OPENAI_MODELS,
  ANTHROPIC_MODELS,
  GOOGLE_MODELS,
  DEEPSEEK_MODELS,
} from "@/constants/models";
import { ApiKeys } from "@/types";

const openAIApiKey = process.env.OPENAI_API_KEY;
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
const googleApiKey = process.env.GOOGLE_API_KEY;
const deepseekApiKey = process.env.DEEPSEEK_API_KEY;

const defaultModel = DEFAULT_MODEL;
const alternativeModel = DEFAULT_MODEL;

// Helper functions to determine model providers
function isOpenAIModel(modelName: string): boolean {
  return Object.values(OPENAI_MODELS).includes(modelName as any);
}

function isAnthropicModel(modelName: string): boolean {
  return Object.values(ANTHROPIC_MODELS).includes(modelName as any);
}

function isGoogleModel(modelName: string): boolean {
  return Object.values(GOOGLE_MODELS).includes(modelName as any);
}

function isDeepSeekModel(modelName: string): boolean {
  return Object.values(DEEPSEEK_MODELS).includes(modelName as any);
}

function getModelProvider(modelName: string): string {
  if (isOpenAIModel(modelName)) return "openai";
  if (isAnthropicModel(modelName)) return "anthropic";
  if (isGoogleModel(modelName)) return "google";
  if (isDeepSeekModel(modelName)) return "deepseek";
  return "unknown";
}

function getModelName(messageCount: number, isAdmin: boolean): string {
  return isAdmin
    ? defaultModel
    : messageCount < 20
      ? defaultModel
      : alternativeModel;
}

function validateAndGetModel(
  selectedModel?: string,
  messageCount?: number,
  isAdmin?: boolean
): string {
  // If a specific model is selected, validate it
  if (selectedModel && VALID_MODELS.includes(selectedModel)) {
    return selectedModel;
  }

  // If selected model is invalid, log warning and fallback to default logic
  if (selectedModel && !VALID_MODELS.includes(selectedModel)) {
    logger.warn(
      `Invalid model selected: ${selectedModel}. Falling back to default.`
    );
  }

  // Use default model selection logic
  return getModelName(messageCount || 0, isAdmin || false);
}

// Model factory function to create chat instances for different providers
function createChatModel(
  modelName: string,
  streaming: boolean = false,
  apiKeys?: ApiKeys
) {
  const provider = getModelProvider(modelName);

  switch (provider) {
    case "openai":
      const openaiKey = apiKeys?.OpenAI || openAIApiKey;
      if (!openaiKey) {
        throw new Error("OpenAI API key is required for this model");
      }
      let temperature: number | undefined = 0;
      if (
        modelName === OPENAI_MODELS.GPT_5 ||
        modelName === OPENAI_MODELS.GPT_5_MINI
      ) {
        temperature = undefined;
      }
      return new ChatOpenAI({
        apiKey: openaiKey,
        modelName,
        streaming,
        temperature,
      });

    case "anthropic":
      const anthropicKey = apiKeys?.Anthropic || anthropicApiKey;
      if (!anthropicKey) {
        throw new Error("Anthropic API key is required for this model");
      }
      return new ChatAnthropic({
        apiKey: anthropicKey,
        modelName,
        streaming,
        temperature: 0,
      });

    case "google":
      const googleKey = apiKeys?.Google || googleApiKey;
      if (!googleKey) {
        throw new Error("Google API key is required for this model");
      }
      return new ChatGoogleGenerativeAI({
        apiKey: googleKey,
        model: modelName,
        streaming,
        temperature: 0,
      });

    case "deepseek":
      const deepseekKey = apiKeys?.DeepSeek || deepseekApiKey;
      if (!deepseekKey) {
        throw new Error("DeepSeek API key is required for this model");
      }
      return new ChatDeepSeek({
        apiKey: deepseekKey,
        modelName,
        streaming,
        temperature: 0,
      });

    default:
      logger.warn(
        `Unknown provider for model: ${modelName}. Falling back to OpenAI.`
      );
      const fallbackKey = apiKeys?.OpenAI || openAIApiKey;
      if (!fallbackKey) {
        throw new Error("OpenAI API key is required for fallback model");
      }
      return new ChatOpenAI({
        apiKey: fallbackKey,
        modelName: DEFAULT_MODEL,
        streaming,
        temperature: 0,
      });
  }
}

function createStreamingModel(
  selectedModel?: string,
  messageCount?: number,
  isAdmin?: boolean,
  apiKeys?: ApiKeys
) {
  const modelName = validateAndGetModel(selectedModel, messageCount, isAdmin);
  return createChatModel(modelName, true, apiKeys);
}

function createNonStreamingModel(
  selectedModel?: string,
  messageCount?: number,
  isAdmin?: boolean,
  apiKeys?: ApiKeys
) {
  const modelName = validateAndGetModel(selectedModel, messageCount, isAdmin);
  return createChatModel(modelName, false, apiKeys);
}

type DocumentChunk = {
  id: string;
  fileKey: string;
  content: string;
  pageNumber: number;
  chunkIndex: number;
};

type retrievalArgs = {
  question: string;
  chatHistory: string;
  previousMessages: string[];
  fileKey: string;
  isAdmin: boolean;
  selectedModel?: string;
  apiKeys?: ApiKeys;
  streamCallbacks: CallbackHandlerMethods;
  localChunks?: DocumentChunk[];
};

const combineDocumentsFn = (docs: Document[]) => {
  const serializedDocs = docs.map((doc) => doc.pageContent);
  return serializedDocs.join("\n\n");
};

const questionPrompt = PromptTemplate.fromTemplate(QUESTION_TEMPLATE);
const answerPrompt = PromptTemplate.fromTemplate(ANSWER_TEMPLATE);
const simpleChatPrompt = PromptTemplate.fromTemplate(SIMPLE_CHAT_TEMPLATE);
const keywordExtractionPrompt = PromptTemplate.fromTemplate(
  KEYWORD_EXTRACTION_TEMPLATE
);

// Enhanced search function using extracted keywords
function searchChunksWithKeywords(
  chunks: DocumentChunk[],
  keywords: string[],
  maxResults: number = 5
): DocumentChunk[] {
  if (!keywords.length) {
    return chunks.slice(0, maxResults);
  }

  const keywordsLower = keywords.map((k) => k.toLowerCase());
  const scoredChunks = chunks.map((chunk) => {
    const contentLower = chunk.content.toLowerCase();
    let score = 0;

    // Score based on keyword matches
    keywordsLower.forEach((keyword, index) => {
      const keywordWords = keyword.split(/\s+/);

      // Exact phrase match (highest score)
      if (contentLower.includes(keyword)) {
        score += (keywords.length - index) * 3; // Higher weight for more important keywords
      }

      // Individual word matches within the phrase
      keywordWords.forEach((word) => {
        if (word.length > 2 && contentLower.includes(word)) {
          score += (keywords.length - index) * 1;
        }
      });
    });

    // Bonus for multiple keyword matches in same chunk
    const matchingKeywords = keywordsLower.filter((k) =>
      contentLower.includes(k)
    );
    if (matchingKeywords.length > 1) {
      score += matchingKeywords.length * 2;
    }

    return { chunk, score };
  });

  return scoredChunks
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(({ chunk }) => chunk);
}

// Create tools for intelligent document search
function createSearchTools(
  chunks: DocumentChunk[],
  selectedModel?: string,
  apiKeys?: ApiKeys
) {
  // Tool for extracting relevant keywords from user queries
  const keywordExtractionTool = new DynamicStructuredTool({
    name: "extract_keywords",
    description:
      "Extract relevant keywords and phrases from a user question to improve document search accuracy",
    schema: z.object({
      question: z.string().describe("The user's question about the document"),
      chatHistory: z.string().describe("Previous conversation context"),
    }),
    func: async (input: { question: string; chatHistory: string }) => {
      const { question, chatHistory } = input;
      try {
        const model = createNonStreamingModel(
          selectedModel,
          0,
          true,
          apiKeys || {}
        );
        const chain = RunnableSequence.from([
          keywordExtractionPrompt,
          model,
          new StringOutputParser(),
        ]);

        const result = await chain.invoke({
          question,
          chat_history: chatHistory,
        });

        // Parse the JSON response
        const cleanResult = result
          .trim()
          .replace(/^```json\s*/, "")
          .replace(/\s*```$/, "");
        const keywords = JSON.parse(cleanResult);

        logger.info("Extracted keywords:", keywords);
        return JSON.stringify(keywords);
      } catch (error) {
        logger.error("Error extracting keywords:", error);
        // Fallback to simple keyword extraction
        const simpleKeywords = question
          .toLowerCase()
          .split(/\s+/)
          .filter(
            (word: string) =>
              word.length > 3 &&
              ![
                "what",
                "where",
                "when",
                "who",
                "why",
                "how",
                "does",
                "this",
                "that",
                "with",
                "from",
                "they",
                "have",
                "been",
                "will",
                "would",
                "could",
                "should",
              ].includes(word)
          );
        return JSON.stringify(simpleKeywords.slice(0, 5));
      }
    },
  });

  // Tool for searching document chunks using keywords
  const chunkSearchTool = new DynamicStructuredTool({
    name: "search_document_chunks",
    description:
      "Search through document chunks using extracted keywords to find relevant information",
    schema: z.object({
      keywords: z.string().describe("JSON array of keywords to search for"),
      maxResults: z
        .number()
        .optional()
        .describe("Maximum number of results to return (default: 5)"),
    }),
    func: async (input: { keywords: string; maxResults?: number }) => {
      const { keywords, maxResults = 5 } = input;
      try {
        const keywordArray = JSON.parse(keywords);
        const results = searchChunksWithKeywords(
          chunks,
          keywordArray,
          maxResults
        );

        const searchResults = results.map((chunk, index) => ({
          rank: index + 1,
          content: chunk.content,
          pageNumber: chunk.pageNumber,
          chunkIndex: chunk.chunkIndex,
        }));

        logger.info(
          `Found ${searchResults.length} relevant chunks using keywords:`,
          keywordArray
        );
        return JSON.stringify(searchResults);
      } catch (error) {
        logger.error("Error searching chunks:", error);
        return JSON.stringify([]);
      }
    },
  });

  return [keywordExtractionTool, chunkSearchTool];
}

// Simple search function for local chunks (fallback)
function searchLocalChunks(
  chunks: DocumentChunk[],
  query: string,
  maxResults: number = 5
): DocumentChunk[] {
  if (!query.trim()) {
    return chunks.slice(0, maxResults);
  }

  const queryLower = query.toLowerCase();
  const scoredChunks = chunks.map((chunk) => {
    const contentLower = chunk.content.toLowerCase();
    const words = queryLower.split(/\s+/);
    let score = 0;

    // Count keyword matches
    words.forEach((word) => {
      if (contentLower.includes(word)) {
        score += 1;
      }
    });

    // Boost score for exact phrase matches
    if (contentLower.includes(queryLower)) {
      score += 2;
    }

    return { chunk, score };
  });

  // Sort by score and return top results
  return scoredChunks
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(({ chunk }) => chunk);
}

// Intelligent RAG function using AI-powered keyword extraction and search
async function createIntelligentRAGResponse({
  question,
  chatHistory,
  selectedModel,
  messageCount,
  isAdmin,
  apiKeys,
  streamCallbacks,
  localChunks,
}: {
  question: string;
  chatHistory: string;
  selectedModel?: string;
  messageCount: number;
  isAdmin: boolean;
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
    logger.info("AI-extracted keywords:", keywords);

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
      createStreamingModel(selectedModel, messageCount, isAdmin, apiKeys),
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

    return new StreamingTextResponse(stream, {
      headers: {
        "x-message-index": (messageCount + 1).toString(),
        "x-sources": serializedSources,
        "x-model": selectedModel || "",
        "x-keywords": Buffer.from(JSON.stringify(keywords)).toString("base64"),
      },
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
      isAdmin,
      apiKeys,
      streamCallbacks,
      localChunks,
    });
  }
}

// Local RAG function using stored chunks (fallback)
async function createLocalRAGResponse({
  question,
  chatHistory,
  selectedModel,
  messageCount,
  isAdmin,
  apiKeys,
  streamCallbacks,
  localChunks,
}: {
  question: string;
  chatHistory: string;
  selectedModel?: string;
  messageCount: number;
  isAdmin: boolean;
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
    createStreamingModel(selectedModel, messageCount, isAdmin, apiKeys),
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

  return new StreamingTextResponse(stream, {
    headers: {
      "x-message-index": (messageCount + 1).toString(),
      "x-sources": serializedSources,
      "x-model": selectedModel || "",
    },
  });
}

// Simple chat function without RAG (when no chunks are available)
async function createSimpleChatResponse({
  question,
  chatHistory,
  selectedModel,
  messageCount,
  isAdmin,
  apiKeys,
  streamCallbacks,
}: {
  question: string;
  chatHistory: string;
  selectedModel?: string;
  messageCount: number;
  isAdmin: boolean;
  apiKeys: ApiKeys;
  streamCallbacks: CallbackHandlerMethods;
}) {
  logger.info("Using simple chat mode (no RAG) - No chunks available");

  const simpleChain = RunnableSequence.from([
    simpleChatPrompt,
    createStreamingModel(selectedModel, messageCount, isAdmin, apiKeys),
    new BytesOutputParser(),
  ]);

  const stream = await simpleChain.stream(
    {
      question,
      chat_history: chatHistory,
    },
    { callbacks: CallbackManager.fromHandlers(streamCallbacks) }
  );

  return new StreamingTextResponse(stream, {
    headers: {
      "x-message-index": (messageCount + 1).toString(),
      "x-sources": Buffer.from(JSON.stringify([])).toString("base64"), // No sources in simple mode
      "x-model": selectedModel || "",
    },
  });
}

export async function retrieval({
  question,
  chatHistory,
  previousMessages,
  fileKey,
  isAdmin,
  selectedModel,
  apiKeys,
  streamCallbacks,
  localChunks,
}: retrievalArgs) {
  const sanitizedQuestion = question.trim().replaceAll("\n", " ");
  const vectorstore = getVectorStore(fileKey);
  const messageCount = previousMessages.length;

  // Priority order: 1) Pinecone (if configured), 2) Intelligent local RAG, 3) Simple chat
  if (!vectorstore) {
    // If local chunks are available, use intelligent RAG with AI-powered keyword extraction
    if (localChunks && localChunks.length > 0) {
      return createIntelligentRAGResponse({
        question: sanitizedQuestion,
        chatHistory,
        selectedModel,
        messageCount,
        isAdmin,
        apiKeys: apiKeys || {},
        streamCallbacks,
        localChunks,
      });
    }

    // Fall back to simple chat if no chunks available
    return createSimpleChatResponse({
      question: sanitizedQuestion,
      chatHistory,
      selectedModel,
      messageCount,
      isAdmin,
      apiKeys: apiKeys || {},
      streamCallbacks,
    });
  }

  /**
   * https://js.langchain.com/docs/expression_language/cookbook/retrieval
   */
  const standaloneQuestionChain = RunnableSequence.from([
    questionPrompt,
    createNonStreamingModel(
      selectedModel,
      messageCount,
      isAdmin,
      apiKeys || {}
    ),
    new StringOutputParser(),
  ]);

  let resolveWithDocuments: (value: Document[]) => void;
  const documentPromise = new Promise<Document[]>((resolve) => {
    resolveWithDocuments = resolve;
  });

  const retriever = vectorstore.asRetriever({
    callbacks: [
      {
        handleRetrieverEnd(documents) {
          resolveWithDocuments(documents);
        },
      },
    ],
  });

  const retrievalChain = retriever.pipe(combineDocumentsFn);

  const answerChain = RunnableSequence.from([
    {
      context: RunnableSequence.from([
        (input) => input.question,
        retrievalChain,
      ]),
      chat_history: (input) => input.chat_history,
      question: (input) => input.question,
    },
    answerPrompt,
    createStreamingModel(selectedModel, messageCount, isAdmin, apiKeys || {}),
  ]);

  const conversationalRetrievalQAChain = RunnableSequence.from([
    {
      question: standaloneQuestionChain,
      chat_history: (input) => input.chat_history,
    },
    answerChain,
    new BytesOutputParser(),
  ]);

  const stream = await conversationalRetrievalQAChain.stream(
    {
      question: sanitizedQuestion,
      chat_history: chatHistory,
    },
    { callbacks: CallbackManager.fromHandlers(streamCallbacks) }
  );

  const documents = await documentPromise;

  // Truncate content and limit number of documents to prevent large strings
  const truncateContent = (
    content: string,
    maxBytes: number = 1000
  ): string => {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(encoder.encode(content).slice(0, maxBytes));
  };

  const limitedDocuments = documents.slice(0, 5); // Limit to 5 documents max
  const serializedSources = Buffer.from(
    JSON.stringify(
      limitedDocuments.map((doc) => {
        return {
          content: truncateContent(doc.pageContent, 1000), // Truncate to 1KB per document
          pageNumber: doc.metadata.pageNumber,
        };
      })
    )
  ).toString("base64");
  return new StreamingTextResponse(stream, {
    headers: {
      "x-message-index": (previousMessages.length + 1).toString(),
      "x-sources": serializedSources,
      "x-model": selectedModel || "",
    },
  });
}

function getVectorStore(fileKey: string) {
  // Check if Pinecone is configured
  if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX_NAME) {
    logger.warn("Pinecone not configured, returning null vector store");
    return null;
  }

  try {
    // Use the same embedding model as in indexing for consistency
    const embeddings = new OpenAIEmbeddings({
      modelName: "text-embedding-3-small",
    });
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    const pineconeIndex = pinecone.index(process.env.PINECONE_INDEX_NAME!);

    const vectorStore = new PineconeStore(embeddings, {
      pineconeIndex,
      namespace: fileKey,
    });

    return vectorStore;
  } catch (err) {
    logger.error("Error while getting vector store", {
      error: err,
    });
    return null;
  }
}
