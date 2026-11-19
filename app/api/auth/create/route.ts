import { NextRequest, NextResponse } from "next/server";
import { Client, Users, ID, Query } from "node-appwrite";
import { verifyRecaptchaToken } from "@/lib/recaptcha";
import { sendWelcomeEmail } from "@/lib/mailer";

function createAdminClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  return { users: new Users(client) };
}

export async function POST(request: NextRequest) {
  try {
    const { username, email, password, captchaToken } = await request.json();

    // 1. Verify Google reCAPTCHA
    const isCaptchaValid = await verifyRecaptchaToken(captchaToken);
    if (!isCaptchaValid) {
      return NextResponse.json(
        { error: "Invalid or expired CAPTCHA. Please try again." },
        { status: 400 },
      );
    }

    // 2. Validate required fields
    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Username, email, and password are required." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 },
      );
    }

    const { users } = createAdminClient();

    // 3. Check if email or username is already taken
    const [existingEmail, existingUsername] = await Promise.all([
      users.list([Query.equal("email", email.trim())]),
      users.list([Query.equal("name", username.trim())]),
    ]);

    if (existingEmail.total > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    if (existingUsername.total > 0) {
      return NextResponse.json(
        { error: "This username is already taken." },
        { status: 409 },
      );
    }

    // 4. Create the user in Appwrite
    const newUser = await users.create(
      ID.unique(),
      email.trim(),
      undefined,
      password,
      username.trim(),
    );

    // 5. Send "Welcome Aboard" Email
    try {
      await sendWelcomeEmail(newUser.email, newUser.name);
    } catch (emailErr) {
      console.error("Failed to send welcome email:", emailErr);
    }

    return NextResponse.json(
      {
        message: "Account created successfully.",
        user: {
          id: newUser.$id,
          username: newUser.name,
          email: newUser.email,
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    const status = error?.code >= 400 && error?.code < 600 ? error.code : 500;
    return NextResponse.json(
      { error: error?.message || "Failed to create account." },
      { status },
    );
  }
}
