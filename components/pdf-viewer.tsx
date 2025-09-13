"use client";

import { FunctionComponent, useEffect, useState } from "react";
import { Resizable } from "re-resizable";
import { useAppStore } from "@/store/app-store";
import { logger } from "@/lib/logger";

interface PdfViewerProps {
  fileKey: string;
}

const PdfViewer: FunctionComponent<PdfViewerProps> = ({
  fileKey,
}: PdfViewerProps) => {
  const [width, setWidth] = useState(0);
  const [maxWidth, setMaxWidth] = useState(window.innerWidth - 826);
  const [activePdfUrl, setActivePdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { getBlobUrlForChat } = useAppStore();

  // Always load PDF from IndexedDB using fileKey
  useEffect(() => {
    const loadPdfFromStorage = async () => {
      if (!fileKey) {
        logger.error("No fileKey provided for PDF loading");
        setActivePdfUrl(null);
        return;
      }

      setIsLoading(true);

      try {
        logger.info("Loading PDF from IndexedDB for fileKey:", fileKey);
        const blobUrl = await getBlobUrlForChat(fileKey);
        if (blobUrl) {
          setActivePdfUrl(blobUrl);
          logger.info("PDF loaded successfully from IndexedDB");
        } else {
          logger.error("Failed to load PDF from storage");
          setActivePdfUrl(null);
        }
      } catch (error) {
        logger.error("Error loading PDF from storage:", error);
        setActivePdfUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadPdfFromStorage();
  }, [fileKey, getBlobUrlForChat]);

  useEffect(() => {
    window.addEventListener("resize", () => {
      setMaxWidth(window.innerWidth - 826);
    });

    return () => {
      window.removeEventListener("resize", () => {});
    };
  }, []);

  return (
    <Resizable
      size={{ width: width || "60%", height: "100%" }}
      maxWidth={maxWidth}
      minWidth={500}
      enable={{
        top: false,
        right: true,
        bottom: false,
        left: false,
        topRight: false,
        bottomRight: false,
        bottomLeft: false,
        topLeft: false,
      }}
      onResizeStop={(e, direction, ref, d) => {
        setWidth(width + d.width);
      }}
      handleComponent={{
        right: (
          <div className="w-1.5 h-full bg-purple-custom-50 dark:bg-neutral-950 cursor-col-resize" />
        ),
      }}
    >
      {isLoading ? (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-md">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading PDF...</p>
          </div>
        </div>
      ) : activePdfUrl ? (
        <iframe
          width="100%"
          height="100%"
          src={activePdfUrl}
          className="rounded-md"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-md">
          <p className="text-gray-600 dark:text-gray-400">PDF not available</p>
        </div>
      )}
    </Resizable>
  );
};

export default PdfViewer;
