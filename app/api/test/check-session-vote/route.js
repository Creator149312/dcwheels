import { getServerSession } from "next-auth/next";
import { authOptions } from "@app/api/auth/[...nextauth]/route";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  const body = await req.json();
  
  return Response.json({
    hasSession: !!session,
    sessionUser: session?.user ? {
      email: session.user.email,
      name: session.user.name,
      id: session.user.id,
    } : null,
    body: body,
    headers: Object.fromEntries(
      Array.from(req.headers.entries()).filter(([k]) => 
        k.toLowerCase().includes('cookie') || k.toLowerCase().includes('auth')
      )
    ),
  });
}
