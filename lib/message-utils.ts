import { UIMessage } from "ai";
import { SourceData, ModelData, KeywordsData } from "@/types/data-parts";

/**
 * Extracts text content from a UIMessage in AI SDK v5 format
 * @param message The UIMessage to extract text from
 * @returns The concatenated text content from all text parts
 */
export function getMessageContent(message: UIMessage): string {
  return message.parts
    .filter(
      (part): part is { type: "text"; text: string } => part.type === "text"
    )
    .map((part) => part.text)
    .join("");
}

/**
 * Checks if a message has text content
 * @param message The UIMessage to check
 * @returns True if the message has text content
 */
export function hasTextContent(message: UIMessage): boolean {
  return message.parts.some((part) => part.type === "text");
}

/**
 * Extracts sources from a message's data parts
 * @param message The UIMessage to extract sources from
 * @returns Array of sources or empty array
 */
export function getMessageSources(
  message: UIMessage
): { content: string; pageNumber: number }[] {
  const sourcePart = message.parts.find(
    (part) => part.type === "data-sources" && "data" in part
  );

  if (sourcePart && "data" in sourcePart) {
    const data = sourcePart.data as SourceData;
    return data.sources || [];
  }
  return [];
}

/**
 * Extracts model information from a message's data parts
 * @param message The UIMessage to extract model from
 * @returns Model name or undefined
 */
export function getMessageModel(message: UIMessage): string | undefined {
  const modelPart = message.parts.find(
    (part) => part.type === "data-model" && "data" in part
  );

  if (modelPart && "data" in modelPart) {
    const data = modelPart.data as ModelData;
    return data.model;
  }
  return undefined;
}

/**
 * Extracts keywords from a message's data parts
 * @param message The UIMessage to extract keywords from
 * @returns Array of keywords or empty array
 */
export function getMessageKeywords(message: UIMessage): string[] {
  const keywordPart = message.parts.find(
    (part) => part.type === "data-keywords" && "data" in part
  );

  if (keywordPart && "data" in keywordPart) {
    const data = keywordPart.data as KeywordsData;
    return data.keywords || [];
  }
  return [];
}
