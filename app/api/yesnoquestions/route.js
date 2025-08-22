import { connectMongoDB } from "@/lib/mongodb";
import YesNoQuestion from "@models/yesnoquestion";

export async function POST(req) {
  try {
    const { text, relatedTo } = await req.json();

    if (!text || !relatedTo?.type || !relatedTo?.id) {
      return new Response("Invalid input", { status: 400 });
    }

    await connectMongoDB();
    const created = await YesNoQuestion.create({
      text,
      relatedTo,
    });

    return Response.json(created, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return new Response("Failed to create question", { status: 500 });
  }
}
