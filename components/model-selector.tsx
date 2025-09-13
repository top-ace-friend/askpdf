"use client";

import { useAppStore } from "@store/app-store";
import { MODEL_OPTIONS } from "@/constants/models";
import { Providers } from "@types";

interface ModelSelectorProps {
  className?: string;
}

const ModelSelector = ({ className }: ModelSelectorProps) => {
  const { selectedModel, setSelectedModel } = useAppStore();

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModel(e.target.value);
  };

  return (
    <div className={className}>
      <select
        value={selectedModel}
        onChange={handleModelChange}
        className="border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 flex w-fit items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        {Object.keys(MODEL_OPTIONS).map((provider) => (
          <optgroup key={provider} label={provider}>
            {MODEL_OPTIONS[provider as Providers].map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
};

export default ModelSelector;
