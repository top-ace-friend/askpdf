"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ApiKeys, useAppStore } from "@store/app-store";
import { MODEL_OPTIONS } from "@/constants/models";
import { OpenAIIcon } from "./icons/openai-icon";
import { ClaudeIcon } from "./icons/claude-icon";
import { GeminiIcon } from "./icons/gemini-icon";
import { DeepSeekIcon } from "./icons/deepseek-icon";
import { Providers, ModelTypes } from "@types";

interface ModelSelectorProps {
  className?: string;
}

const ModelSelector = ({ className }: ModelSelectorProps) => {
  const { apiKeys } = useAppStore();

  const { selectedModel, setSelectedModel } = useAppStore();
  const [tooltipVisible, setTooltipVisible] = useState<string | null>(null);

  const handleModelChange = (value: string) => {
    setSelectedModel(value);
  };

  const selectedModelData = Object.values(MODEL_OPTIONS)
    .find((providerModels) =>
      providerModels.some((model) => model.value === selectedModel)
    )
    ?.find((model) => model.value === selectedModel);

  const getModelProviderIcon = (provider: Providers) => {
    switch (provider) {
      case Providers.OpenAI:
        return <OpenAIIcon size={16} />;
      case Providers.Anthropic:
        return <ClaudeIcon size={16} />;
      case Providers.Google:
        return <GeminiIcon size={16} />;
      case Providers.DeepSeek:
        return <DeepSeekIcon size={16} />;
    }
  };

  return (
    <div className={className}>
      <Select value={selectedModel} onValueChange={handleModelChange}>
        <SelectTrigger className="w-full gap-2">
          <SelectValue placeholder="Select model">
            <div className="flex items-center gap-1.5">
              {getModelProviderIcon(selectedModelData?.provider as Providers)}
              <span>{selectedModelData?.label}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.keys(MODEL_OPTIONS).map((option) => (
            <SelectGroup key={option}>
              <SelectLabel className="text-sm font-normal text-neutral-500">
                {option}
              </SelectLabel>
              {MODEL_OPTIONS[option as Providers].map((option) => {
                const isProModel = option.modelType === ModelTypes.Pro;
                const isProModelDisabled =
                  isProModel && !apiKeys[option.provider as keyof ApiKeys];

                const selectItemContent = (
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      {getModelProviderIcon(option.provider as Providers)}
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{option.label}</span>
                          {isProModel && (
                            <span className="text-xs px-1.5 py-0.5 bg-purple-custom-300 dark:bg-purple-custom-800 rounded-full text-neutral-900 dark:text-neutral-200">
                              {option.modelType}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      </div>
                    </div>
                  </div>
                );

                if (isProModelDisabled) {
                  return (
                    <div
                      key={option.value}
                      className="relative"
                      onMouseEnter={() => setTooltipVisible(option.value)}
                      onMouseLeave={() => setTooltipVisible(null)}
                    >
                      <SelectItem
                        value={option.value}
                        disabled={isProModelDisabled}
                      >
                        {selectItemContent}
                      </SelectItem>
                      {tooltipVisible === option.value && (
                        <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full bg-neutral-600 text-white text-xs px-2 py-1 rounded shadow-lg z-100 whitespace-nowrap">
                          Add your API key to use this model
                        </div>
                      )}
                    </div>
                  );
                } else {
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      {selectItemContent}
                    </SelectItem>
                  );
                }
              })}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ModelSelector;
