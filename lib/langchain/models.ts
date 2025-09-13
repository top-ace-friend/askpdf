import {
  DEFAULT_MODEL,
  OPENAI_MODELS,
  ANTHROPIC_MODELS,
  GOOGLE_MODELS,
  DEEPSEEK_MODELS,
  VALID_MODELS,
} from "@constants/models";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatDeepSeek } from "@langchain/deepseek";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { logger } from "@lib/logger";
import { ApiKeys } from "@types";

const openAIApiKey = process.env.OPENAI_API_KEY;
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
const googleApiKey = process.env.GOOGLE_API_KEY;
const deepseekApiKey = process.env.DEEPSEEK_API_KEY;

const defaultModel = DEFAULT_MODEL;

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

function validateAndGetModel(selectedModel?: string): string {
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
  return defaultModel;
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

export function createStreamingModel(
  selectedModel?: string,
  apiKeys?: ApiKeys
) {
  const modelName = validateAndGetModel(selectedModel);
  return createChatModel(modelName, true, apiKeys);
}

export function createNonStreamingModel(
  selectedModel?: string,
  apiKeys?: ApiKeys
) {
  const modelName = validateAndGetModel(selectedModel);
  return createChatModel(modelName, false, apiKeys);
}
