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
import { Providers } from "@types";

interface ModelSelectorProps {
  className?: string;
}

const ModelSelector = ({ className }: ModelSelectorProps) => {
  const { selectedModel, setSelectedModel } = useAppStore();

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
      <Select value={selectedModel} onValueChange={handleModelChange} disabled>
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
                const selectItemContent = (
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      {getModelProviderIcon(option.provider as Providers)}
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{option.label}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      </div>
                    </div>
                  </div>
                );

                return (
                  <SelectItem key={option.value} value={option.value}>
                    {selectItemContent}
                  </SelectItem>
                );
              })}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ModelSelector;
