import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
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
import { ApiKeys, DocumentChunk } from "@types";
import { logger } from "@lib/logger";
import { QUESTION_TEMPLATE, ANSWER_TEMPLATE } from "@lib/prompts";
import { createNonStreamingModel, createStreamingModel } from "./models";
import {
  createIntelligentRAGResponse,
  createSimpleChatResponse,
  combineDocumentsFn,
  createStreamingTextStream,
} from "./responses";

type retrievalArgs = {
  question: string;
  chatHistory: string;
  previousMessages: string[];
  fileKey: string;
  selectedModel?: string;
  apiKeys?: ApiKeys;
  localChunks?: DocumentChunk[];
  streamCallbacks: CallbackHandlerMethods;
};

const questionPrompt = PromptTemplate.fromTemplate(QUESTION_TEMPLATE);
const answerPrompt = PromptTemplate.fromTemplate(ANSWER_TEMPLATE);

export async function retrieval({
  question,
  chatHistory,
  previousMessages,
  fileKey,
  selectedModel,
  apiKeys,
  localChunks,
  streamCallbacks,
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
      apiKeys: apiKeys || {},
      streamCallbacks,
    });
  }

  /**
   * https://js.langchain.com/docs/expression_language/cookbook/retrieval
   */
  const standaloneQuestionChain = RunnableSequence.from([
    questionPrompt,
    createNonStreamingModel(selectedModel, apiKeys || {}),
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
    createStreamingModel(selectedModel, apiKeys || {}),
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
  const sources = limitedDocuments.map((doc) => {
    return {
      content: truncateContent(doc.pageContent, 1000), // Truncate to 1KB per document
      pageNumber: doc.metadata.pageNumber,
    };
  });

  console.log("🌲 Pinecone RAG - Creating response with:", {
    sourcesCount: sources.length,
    model: selectedModel || "",
    messageIndex: previousMessages.length + 1,
    totalDocuments: documents.length,
    limitedDocuments: limitedDocuments.length,
  });

  return createStreamingTextStream(stream, {
    sources: sources,
    model: selectedModel || "",
    messageIndex: previousMessages.length + 1,
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
