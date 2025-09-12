"use client";

import axios from "axios";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import { uploadToS3 } from "@/lib/s3";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { logger } from "@lib/logger";
import LimitReachedDialog from "./dialogs/limit-reached-dialog";
import { useAppStore } from "@store/app-store";
import { SafeChat } from "@lib/db/schema";
import { useDbEvents } from "@providers/db-events-provider";
import { cn } from "@/lib/utils";
import { PdfIcon } from "./icons/pdf-icon";
import { FileUploadIcon } from "./icons/file-upload-icon";

const FileUpload = () => {
  const router = useRouter();
  const { settings } = useDbEvents();
  const { freeChats, isUsageRestricted, fileCount, addChat } = useAppStore();

  const chatLimit = freeChats || Number(settings?.free_chats);

  const [isUploading, setIsUploading] = useState(false);
  const [showLimitDialog, setShowLimitDialog] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: async ({
      file_key,
      file_name,
    }: {
      file_key: string;
      file_name: string;
    }) => {
      const response = await axios.post("/api/create-chat", {
        file_key,
        file_name,
      });
      return response.data;
    },
  });

  const onDrop = useCallback(
    async (acceptedFiles: any) => {
      if (isUsageRestricted && fileCount === chatLimit) {
        setShowLimitDialog(true);
        return;
      }

      const file = acceptedFiles[0];
      if (file.size > 5 * 1024 * 1024) {
        // bigger than 5mb
        toast.error("File too large");
        return;
      } else {
        try {
          setIsUploading(true);
          const data = await uploadToS3(file);
          if (!data?.file_key || !data.file_name) {
            toast.error("Something went wrong");
            return;
          }
          mutate(data, {
            onSuccess: ({ chat }: { chat: SafeChat }) => {
              toast.success("Uploaded file successfully");
              addChat(chat);
              router.push(`/chat/${chat.id}`);
            },
            onError: () => {
              toast.error("Error creating chat");
            },
          });
        } catch (error) {
          logger.error("Error uploading file:", {
            error,
          });
        } finally {
          setIsUploading(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mutate, router, fileCount, chatLimit, isUsageRestricted]
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
            <FileUploadIcon size={85} />
            <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-200 mt-4">
              Spilling tea to AI...
            </p>
          </>
        ) : (
          <>
            <PdfIcon
              size={85}
              className={cn({
                "opacity-50": isDragActive,
              })}
            />
            <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-200 mt-4">
              {isDragActive
                ? "Drop your file here"
                : "Drag and drop your file here or click to select file"}
            </p>
            <div className="flex gap-2 mt-2 text-sm">
              <p className="text-neutral-400 dark:text-neutral-500 border-r-2 border-neutral-300 dark:border-neutral-700 pr-2">
                Supported file types: PDF
              </p>
              <p className="text-neutral-400 dark:text-neutral-500">
                Max file size: 5MB
              </p>
            </div>
          </>
        )}

        <LimitReachedDialog
          type="file"
          open={showLimitDialog}
          setOpen={setShowLimitDialog}
        />
      </div>
    </div>
  );
};

export default FileUpload;
