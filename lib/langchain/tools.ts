import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { logger } from "@lib/logger";
import { DocumentChunk, ApiKeys } from "@types";
import z from "zod";
import { createNonStreamingModel } from "./models";
import { PromptTemplate } from "@langchain/core/prompts";
import { KEYWORD_EXTRACTION_TEMPLATE } from "@lib/prompts";

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
export function createSearchTools(
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
        const model = createNonStreamingModel(selectedModel, apiKeys);
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
          `Found ${
            searchResults.length
          } relevant chunks using keywords on pages: ${searchResults
            .map((result) => result.pageNumber)
            .join(", ")}`
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
export function searchLocalChunks(
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
