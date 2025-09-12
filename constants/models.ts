import { Providers, ModelTypes, ModelOption } from "@types";

// OpenAI model configurations
export const OPENAI_MODELS = {
  GPT_5: "gpt-5",
  GPT_5_MINI: "gpt-5-mini",
  GPT_4_1: "gpt-4.1",
  GPT_4O_MINI: "gpt-4o-mini",
} as const;

// Anthropic model configurations
export const ANTHROPIC_MODELS = {
  CLAUDE_4_SONNET: "claude-sonnet-4-20250514",
  CLAUDE_3_7_SONNET: "claude-3-7-sonnet-latest",
  CLAUDE_3_5_HAIKU: "claude-3-5-haiku-latest",
} as const;

// Google model configurations
export const GOOGLE_MODELS = {
  GEMINI_2_5_PRO: "gemini-2.5-pro",
  GEMINI_2_5_FLASH: "gemini-2.5-flash",
} as const;

// DeepSeek model configurations
export const DEEPSEEK_MODELS = {
  DEEPSEEK_R1: "deepseek-reasoner",
  DEEPSEEK_V3: "deepseek-chat",
} as const;

// All available models
export const ALL_MODELS = {
  ...OPENAI_MODELS,
  ...ANTHROPIC_MODELS,
  ...GOOGLE_MODELS,
  ...DEEPSEEK_MODELS,
} as const;

// Available models for selection
export const VALID_MODELS = Object.values(ALL_MODELS) as string[];

// Default model
export const DEFAULT_MODEL = GOOGLE_MODELS.GEMINI_2_5_FLASH;

// Model options for the UI selector
export const MODEL_OPTIONS: Record<Providers, ModelOption[]> = {
  // OpenAI Models
  [Providers.OpenAI]: [
    {
      value: OPENAI_MODELS.GPT_5,
      label: "GPT-5",
      description: "Most capable OpenAI model",
      provider: Providers.OpenAI,
      credits: 1,
      modelType: ModelTypes.Pro,
    },
    {
      value: OPENAI_MODELS.GPT_5_MINI,
      label: "GPT-5 Mini",
      description: "Balanced speed and intelligence",
      provider: Providers.OpenAI,
      credits: 1,
      modelType: ModelTypes.Basic,
    },
    {
      value: OPENAI_MODELS.GPT_4_1,
      label: "GPT-4.1",
      description: "Direct responses, no reasoning chains",
      provider: Providers.OpenAI,
      credits: 1,
      modelType: ModelTypes.Pro,
    },
    {
      value: OPENAI_MODELS.GPT_4O_MINI,
      label: "GPT-4o Mini",
      description: "Quick responses for simple queries",
      provider: Providers.OpenAI,
      credits: 1,
      modelType: ModelTypes.Basic,
    },
  ],
  // Anthropic Models
  [Providers.Anthropic]: [
    {
      value: ANTHROPIC_MODELS.CLAUDE_4_SONNET,
      label: "Claude 4 Sonnet",
      description: "Top-tier analysis and writing",
      provider: Providers.Anthropic,
      credits: 2,
      modelType: ModelTypes.Pro,
    },
    {
      value: ANTHROPIC_MODELS.CLAUDE_3_7_SONNET,
      label: "Claude 3.7 Sonnet",
      description: "Excellent for complex documents",
      provider: Providers.Anthropic,
      credits: 2,
      modelType: ModelTypes.Pro,
    },
    {
      value: ANTHROPIC_MODELS.CLAUDE_3_5_HAIKU,
      label: "Claude 3.5 Haiku",
      description: "Fast, concise responses",
      provider: Providers.Anthropic,
      credits: 1,
      modelType: ModelTypes.Basic,
    },
  ],
  // Google Models
  [Providers.Google]: [
    {
      value: GOOGLE_MODELS.GEMINI_2_5_PRO,
      label: "Gemini 2.5 Pro",
      description: "Premium model with strong reasoning",
      provider: Providers.Google,
      credits: 0,
      modelType: ModelTypes.Pro,
    },
    {
      value: GOOGLE_MODELS.GEMINI_2_5_FLASH,
      label: "Gemini 2.5 Flash",
      description: "Fast model for everyday use",
      provider: Providers.Google,
      credits: 0,
      modelType: ModelTypes.Basic,
    },
  ],
  // DeepSeek Models
  [Providers.DeepSeek]: [
    {
      value: DEEPSEEK_MODELS.DEEPSEEK_R1,
      label: "DeepSeek R1",
      description: "Advanced reasoning model",
      provider: Providers.DeepSeek,
      credits: 0,
      modelType: ModelTypes.Pro,
    },
    {
      value: DEEPSEEK_MODELS.DEEPSEEK_V3,
      label: "DeepSeek V3",
      description: "General-purpose model",
      provider: Providers.DeepSeek,
      credits: 0,
      modelType: ModelTypes.Basic,
    },
  ],
};
