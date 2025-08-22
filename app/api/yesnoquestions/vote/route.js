// /app/api/questions/vote/route.js
import { connectMongoDB } from "@/lib/mongodb";
import YesNoQuestion from "@models/yesnoquestion";

export async function POST(req) {
  await connectMongoDB();

  try {
    const { questionId, vote } = await req.json();

    if (!questionId || !["yes", "no"].includes(vote)) {
      return new Response(JSON.stringify({ error: "Invalid vote" }), { status: 400 });
    }

    const updated = await YesNoQuestion.findByIdAndUpdate(
      questionId,
      { $inc: { [`responses.${vote}`]: 1 } },
      { new: true } // returns updated doc
    );

    if (!updated) {
      return new Response("Question not found", { status: 404 });
    }

    return new Response(JSON.stringify(updated), { status: 200 });
  } catch (err) {
    console.error("Vote Error:", err);
    return new Response("Server error", { status: 500 });
  }
}
