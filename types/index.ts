export enum FeatureFlags {
  Billing = "billing",
}

export enum AppSettings {
  FreeChats = "free_chats",
  FreeMessages = "free_messages",
}

export enum Providers {
  OpenAI = "OpenAI",
  Anthropic = "Anthropic",
  Google = "Google",
  DeepSeek = "DeepSeek",
}

export enum ModelTypes {
  Basic = "Basic",
  Pro = "Pro",
}

export interface ApiKeys {
  [Providers.OpenAI]?: string;
  [Providers.Anthropic]?: string;
  [Providers.Google]?: string;
  [Providers.DeepSeek]?: string;
}

export interface ModelOption {
  value: string;
  label: string;
  description: string;
  provider: Providers;
  credits: number;
  modelType: ModelTypes;
}
