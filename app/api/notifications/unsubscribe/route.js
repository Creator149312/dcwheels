import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import User from "@/models/user";
import { verifyUnsubscribeToken } from "@/lib/milestoneEmailService";

/**
 * GET /api/notifications/unsubscribe?uid=...&token=...&email=...
 *
 * 1-click tokenized unsubscribe for transactional & milestone emails.
 * Allows user to unsubscribe from emails directly without requiring login.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    if (!uid || !token || !email) {
      return new NextResponse(renderHtml("Invalid Request", "The unsubscribe link is missing required parameters."), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Verify cryptographic token
    try {
      const isValid = verifyUnsubscribeToken(uid, email, token);
      if (!isValid) {
        return new NextResponse(renderHtml("Invalid Token", "This unsubscribe link is invalid or has expired."), {
          status: 403,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
    } catch {
      return new NextResponse(renderHtml("Verification Error", "Unable to verify the unsubscribe token."), {
        status: 403,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    await connectMongoDB();
    const updated = await User.findByIdAndUpdate(uid, { emailNotifications: false });

    if (!updated) {
      return new NextResponse(renderHtml("User Not Found", "No account was found matching this request."), {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new NextResponse(
      renderHtml(
        "Unsubscribed Successfully",
        `You will no longer receive interaction and milestone email notifications for ${email}. You can re-enable this anytime in your Spinpapa settings.`,
        true
      ),
      {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return new NextResponse(renderHtml("Error", "An unexpected error occurred while processing your request."), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

function renderHtml(title, message, isSuccess = false) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Spinpapa</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 16px;
      box-sizing: border-box;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      max-width: 480px;
      width: 100%;
      padding: 32px 24px;
      text-align: center;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .logo {
      font-weight: 900;
      font-size: 20px;
      margin-bottom: 24px;
      letter-spacing: -0.02em;
    }
    .icon {
      font-size: 40px;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 20px;
      font-weight: 800;
      margin: 0 0 12px 0;
      letter-spacing: -0.01em;
    }
    p {
      font-size: 14px;
      line-height: 1.6;
      color: #64748b;
      margin: 0 0 24px 0;
    }
    .btn {
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
      padding: 10px 20px;
      border-radius: 10px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Spinpapa</div>
    <div class="icon">${isSuccess ? "✓" : "!"}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="/" class="btn">Return to Spinpapa</a>
  </div>
</body>
</html>`;
}
