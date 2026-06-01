"use client";

import { useState, useEffect } from "react";
import { SettingsIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { useAppStore, ApiKeys } from "@/store/app-store";
import toast from "react-hot-toast";
import { logger } from "@lib/logger";
import { Providers } from "@types";

export default function SettingsDialog() {
  const { apiKeys, setApiKeys } = useAppStore();
  const [formData, setFormData] = useState<ApiKeys>({});
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load current API keys when dialog opens
  useEffect(() => {
    if (isOpen) {
      setFormData({ ...apiKeys });
    }
  }, [isOpen, apiKeys]);

  const handleInputChange = (key: keyof ApiKeys, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const handleSave = () => {
    setIsSaving(true);
    try {
      // Filter out empty strings and set only non-empty values
      const filteredApiKeys: ApiKeys = {};
      Object.entries(formData).forEach(([key, value]) => {
        if (value && value.trim()) {
          filteredApiKeys[key as keyof ApiKeys] = value.trim();
        }
      });

      setApiKeys(filteredApiKeys);
      toast.success("API keys saved successfully");
    } catch (error) {
      logger.error("Error saving API keys:", error);
      toast.error("Failed to save API keys");
    } finally {
      setIsSaving(false);
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger>
        <div className="gap-2 flex items-center border border-neutral-300 dark:border-neutral-700 hover:text-accent-foreground rounded-md px-4 py-2 hover:bg-accent">
          <SettingsIcon size={16} />
          Settings
        </div>
      </DialogTrigger>
      <DialogContent className="min-w-[400px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 mb-2">
            <p className="text-sm font-medium">API Keys</p>
            <p className="text-sm text-muted-foreground">
              Add your AI provider API keys to use different models.
            </p>
          </div>
          <APIKeyInput
            label="OpenAI API Key"
            id="openai-api-key"
            placeholder="Enter your OpenAI API Key"
            value={formData.OpenAI || ""}
            onChange={(value) => handleInputChange(Providers.OpenAI, value)}
          />
          <APIKeyInput
            label="Anthropic API Key"
            id="anthropic-api-key"
            placeholder="Enter your Anthropic API Key"
            value={formData.Anthropic || ""}
            onChange={(value) => handleInputChange(Providers.Anthropic, value)}
          />
          <APIKeyInput
            label="Google API Key"
            id="google-api-key"
            placeholder="Enter your Google API Key"
            value={formData.Google || ""}
            onChange={(value) => handleInputChange(Providers.Google, value)}
          />
          <APIKeyInput
            label="DeepSeek API Key"
            id="deepseek-api-key"
            placeholder="Enter your DeepSeek API Key"
            value={formData.DeepSeek || ""}
            onChange={(value) => handleInputChange(Providers.DeepSeek, value)}
          />
          <div className="flex flex-col gap-2 mt-2">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const APIKeyInput = ({
  label,
  id,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  id: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) => {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-neutral-700 dark:text-neutral-300">
        {label}
      </Label>
      <Input
        id={id}
        placeholder={placeholder}
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-neutral-700 dark:text-neutral-300 placeholder:text-neutral-500"
      />
    </div>
  );
};
