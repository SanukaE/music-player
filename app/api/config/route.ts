import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    recaptchaSiteKey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "",
    appwriteEndpoint:
      process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
      "https://cloud.appwrite.io/v1",
    appwriteProjectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "",
  });
}
