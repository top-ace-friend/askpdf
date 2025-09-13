"use client";

import axios from "axios";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { logger } from "@lib/logger";
import { DocumentChunk, LocalChat, useAppStore } from "@store/app-store";
import { fileStorage } from "@/lib/file-storage";
import { cn } from "@/lib/utils";
import { FileText, Loader2 } from "lucide-react";

const FileUpload = () => {
  const router = useRouter();
  const { chats, addChat, addChunks } = useAppStore();

  const [isUploading, setIsUploading] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: async ({
      file_key,
      file_name,
      file,
    }: {
      file_key: string;
      file_name: string;
      file: File;
    }) => {
      const formData = new FormData();
      formData.append("file_key", file_key);
      formData.append("file_name", file_name);
      formData.append("file", file);

      const response = await axios.post("/api/create-chat", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    },
  });

  const onDrop = useCallback(
    async (acceptedFiles: any) => {
      const file = acceptedFiles[0];
      if (file.size > 10 * 1024 * 1024) {
        // bigger than 10mb
        toast.error("File too large (max 10MB)");
        return;
      } else {
        try {
          setIsUploading(true);

          // Create a file key and blob URL for local storage
          const fileKey =
            "local_" +
            Date.now().toString() +
            "_" +
            file.name.replace(/\s+/g, "-");

          const data = {
            file_key: fileKey,
            file_name: file.name,
            file: file,
          };

          mutate(data, {
            onSuccess: async ({
              chat,
              chunks,
            }: {
              chat: LocalChat;
              chunks: DocumentChunk[];
            }) => {
              try {
                toast.success("File uploaded successfully");

                // Store file in IndexedDB
                await fileStorage.storeFile(chat.fileKey, file);

                const chatWithUrl = {
                  ...chat,
                  pdfUrl: "", // Don't store temporary blob URL
                };

                addChat(chatWithUrl);

                // Add chunks to store if they exist
                if (chunks && chunks.length > 0) {
                  addChunks(chunks);
                  logger.info(`Added ${chunks.length} chunks to store`);
                }

                router.push(`/chat/${chat.id}`);
              } catch (error) {
                logger.error("Error storing file:", error);
                toast.error("Error storing file locally");
              }
            },
            onError: () => {
              toast.error("Error creating chat");
            },
          });
        } catch (error) {
          logger.error("Error processing file:", error);
          toast.error("Error processing file");
        } finally {
          setIsUploading(false);
        }
      }
    },
    [mutate, router, addChat, addChunks]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    disabled: isPending || isUploading,
    onDrop,
  });

  return (
    <div className="w-1/2 bg-neutral-50 dark:bg-neutral-900 rounded-xl p-5">
      <div
        {...getRootProps({
          className: cn(
            "border-dashed border-2 rounded-xl cursor-pointer p-5 py-8 flex justify-center items-center flex-col dark:border-neutral-500",
            {
              "bg-neutral-100 dark:bg-neutral-800": isDragActive,
              "cursor-not-allowed": isPending || isUploading,
            }
          ),
        })}
      >
        <input {...getInputProps()} />
        {isPending || isUploading ? (
          <>
            <Loader2 size={35} strokeWidth={1.5} className="animate-spin" />
            <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-200 mt-4">
              Spilling tea to AI...
            </p>
          </>
        ) : (
          <>
            <FileText
              size={85}
              strokeWidth={1}
              className={cn("text-neutral-800 dark:text-neutral-200", {
                "opacity-50": isDragActive,
              })}
            />
            <p className="text-lg text-center font-semibold text-neutral-900 dark:text-neutral-200 mt-4">
              {isDragActive
                ? "Drop your file here"
                : "Drag and drop your file here or click to select file"}
            </p>
            <div className="flex gap-2 mt-2 text-sm">
              <p className="text-neutral-400 dark:text-neutral-500 border-r-2 border-neutral-300 dark:border-neutral-700 pr-2">
                Supported file types: PDF
              </p>
              <p className="text-neutral-400 dark:text-neutral-500">
                Max file size: 10MB
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
