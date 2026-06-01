import { Pinecone, PineconeRecord } from "@pinecone-database/pinecone";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import md5 from "md5";
import { convertToAscii } from "./utils";
import { getEmbeddings } from "./embeddings";
import { logger } from "./logger";

let pinecone: Pinecone | null = null;

export const getPineconeClient = () => {
  if (!process.env.PINECONE_API_KEY) {
    throw new Error("Pinecone API key not configured");
  }

  if (!pinecone) {
    pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
  }
  return pinecone;
};

type PDFPage = {
  pageContent: string;
  metadata: {
    loc: { pageNumber: number };
    pdf: {
      totalPages: number;
    };
  };
};

type RecordMetadata = {
  text: string;
  pageNumber: number;
  fileKey: string;
  chunkLength: number;
  preview: string;
};

export async function loadS3IntoPinecone(fileKey: string) {
  // Check if Pinecone is configured
  if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX_NAME) {
    logger.warn(
      "Pinecone not configured, skipping vector storage for file:",
      fileKey
    );
    return;
  }

  try {
    // In open source version, we don't process files through Pinecone by default
    logger.debug("Pinecone loading skipped in open source version");
    return;
  } catch (err) {
    logger.error("Error in Pinecone processing:", {
      fileKey,
      error: err,
    });
    throw err;
  }
}

// This function is kept for compatibility but not used in the open source version
async function embedDocument(
  doc: PDFPage,
  fileKey: string
): Promise<PineconeRecord<RecordMetadata> | null> {
  // This function would be used if Pinecone processing was enabled
  logger.debug(
    "embedDocument called but not processing in open source version"
  );
  return null;
}

export function truncateStringByByte(str: string, bytes: number) {
  const enc = new TextEncoder();
  return new TextDecoder("utf-8").decode(enc.encode(str).slice(0, bytes));
}

export async function deleteVectors(fileKey: string) {
  // Check if Pinecone is configured
  if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX_NAME) {
    logger.warn(
      "Pinecone not configured, skipping vector deletion for file:",
      fileKey
    );
    return;
  }

  try {
    const client = await getPineconeClient();
    const index = client
      .index(process.env.PINECONE_INDEX_NAME!)
      .namespace(fileKey);
    const prefix = fileKey + "#";

    const pageOneList = await index.listPaginated({ prefix });
    const pageOneVectorIds =
      pageOneList.vectors?.map((vector) => vector.id) ?? [];
    if (pageOneVectorIds.length > 0) await index.deleteMany(pageOneVectorIds);

    let paginationToken = pageOneList.pagination?.next;

    while (paginationToken) {
      const nextPageList = await index.listPaginated({
        prefix,
        paginationToken,
      });
      const nextPageVectorIds =
        nextPageList.vectors?.map((vector) => vector.id) ?? [];
      if (nextPageVectorIds.length > 0)
        await index.deleteMany(nextPageVectorIds);
      else break;
      paginationToken = nextPageList.pagination?.next;
    }
    logger.debug("Success deleting vectors", fileKey);
  } catch (err) {
    logger.error("Error deleting vectors:", {
      fileKey,
      error: err,
    });
    throw err;
  }
}
