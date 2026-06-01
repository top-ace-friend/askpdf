import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { chatId } = await req.json();

  // In the open source version, messages are stored client-side
  // This API endpoint is kept for compatibility but returns empty arrays
  // since all data is managed in localStorage via the store
  
  return NextResponse.json({
    messages: [],
    sources: [],
  });
}
