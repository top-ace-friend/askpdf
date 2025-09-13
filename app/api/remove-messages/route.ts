import { logger } from "@lib/logger";
import { deleteVectors } from "@lib/pinecone";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { chatId, fileKey } = await req.json();
  try {
    // Optional: Remove vectors from Pinecone if configured
    try {
      if (process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX_NAME) {
        await deleteVectors(fileKey);
      }
    } catch (pineconeError) {
      logger.warn("Failed to delete vectors from Pinecone:", pineconeError);
    }
    
    // In open source version, actual chat/message removal is handled client-side
    // This endpoint just handles cleanup of external services
    return NextResponse.json({ chatId });
  } catch (err) {
    logger.error("Error removing messages:", {
      chatId,
      fileKey,
      error: err,
    });
    return new NextResponse("Internal server error", { status: 500 });
  }
}
