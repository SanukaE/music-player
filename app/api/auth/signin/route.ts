import { NextRequest, NextResponse } from "next/server";
import { Client, Account } from "node-appwrite";
import { verifyRecaptchaToken } from "@/lib/recaptcha";

export async function POST(request: NextRequest) {
  try {
    const { email, password, captchaToken } = await request.json();

    const isCaptchaValid = await verifyRecaptchaToken(captchaToken);
    if (!isCaptchaValid) {
      return NextResponse.json(
        { error: "Invalid or expired CAPTCHA. Please try again." },
        { status: 400 },
      );
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!);

    const account = new Account(client);
    const session = await account.createEmailPasswordSession(
      email.trim(),
      password,
    );

    const response = NextResponse.json(
      { message: "Signed in successfully." },
      { status: 200 },
    );

    response.cookies.set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error: any) {
    const status = error?.code >= 400 && error?.code < 600 ? error.code : 401;
    return NextResponse.json(
      { error: error?.message || "Invalid email or password." },
      { status },
    );
  }
}
