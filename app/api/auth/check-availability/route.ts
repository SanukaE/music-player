import { NextRequest, NextResponse } from "next/server";
import { Client, Users, Query } from "node-appwrite";

function createAdminClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  return { users: new Users(client) };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username")?.trim();
    const email = searchParams.get("email")?.trim();

    if (!username && !email) {
      return NextResponse.json(
        { error: "Provide a username or email to check." },
        { status: 400 },
      );
    }

    const { users } = createAdminClient();

    if (username) {
      const result = await users.list([Query.equal("name", username)]);
      return NextResponse.json(
        { available: result.total === 0 },
        { status: 200 },
      );
    }

    if (email) {
      const result = await users.list([Query.equal("email", email)]);
      return NextResponse.json(
        { available: result.total === 0 },
        { status: 200 },
      );
    }

    return NextResponse.json({ available: false }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to check availability." },
      { status: 500 },
    );
  }
}
