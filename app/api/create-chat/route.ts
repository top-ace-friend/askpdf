import { loadS3IntoPinecone } from "@/lib/pinecone";
import { logger } from "@lib/logger";
import { NextResponse } from "next/server";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import PDFParse from "pdf-parse";

export const dynamic = "force-dynamic";

async function extractTextFromPDF(
  fileBuffer: Buffer
): Promise<{ text: string; pageCount: number }> {
  try {
    const data = await PDFParse(fileBuffer);

    if (!data || typeof data.text !== "string") {
      throw new Error("PDF parsing returned invalid data");
    }

    logger.info(
      `Extracted ${data.text.length} characters from ${data.numpages} pages`
    );

    return {
      text: data.text || "",
      pageCount: data.numpages || 0,
    };
  } catch (error) {
    logger.error("Error extracting text from PDF:", error);
    throw new Error("Failed to extract text from PDF");
  }
}

async function createDocumentChunks(
  text: string,
  fileKey: string,
  pageCount: number
): Promise<any[]> {
  try {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const chunks = await splitter.splitText(text);

    return chunks.map((chunk, index) => ({
      id: crypto.randomUUID(),
      fileKey,
      content: chunk,
      pageNumber: Math.ceil((index + 1) * (pageCount / chunks.length)), // Approximate page number
      chunkIndex: index,
    }));
  } catch (error) {
    logger.error("Error creating document chunks:", error);
    throw new Error("Failed to create document chunks");
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file_key = formData.get("file_key") as string;
    const file_name = formData.get("file_name") as string;
    const file = formData.get("file") as File;

    // Create a local chat object
    const newChat = {
      id: crypto.randomUUID(),
      fileKey: file_key,
      pdfName: file_name,
      pdfUrl: "", // Will be set on client side
      createdAt: new Date().toISOString(),
    };

    let chunks: any[] = [];

    // Process PDF file if provided
    if (file && file.size > 0) {
      try {
        logger.info(
          `Processing PDF file: ${file.name}, size: ${file.size} bytes`
        );

        // Convert File to ArrayBuffer, then to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);

        // Extract text from PDF
        const { text, pageCount } = await extractTextFromPDF(fileBuffer);
        logger.info(
          `Processed PDF: ${text.length} characters extracted, ${pageCount} pages`
        );

        // Create chunks
        chunks = await createDocumentChunks(text, file_key, pageCount);
        logger.info(`Processed PDF: ${chunks.length} chunks created`);
      } catch (pdfError) {
        logger.warn("Failed to process PDF content:", pdfError);
        // Continue without chunks if PDF processing fails
      }
    }

    // Optional: Load into Pinecone if configured
    try {
      if (process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX_NAME) {
        await loadS3IntoPinecone(file_key);
      }
    } catch (pineconeError) {
      logger.warn(
        "Pinecone not configured or failed, continuing without vector search:",
        pineconeError
      );
    }

    return NextResponse.json(
      {
        chat: newChat,
        chunks: chunks,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Error creating chat:", error);
    return NextResponse.json({
      error: "internal server error",
      status: 500,
    });
  }
}
