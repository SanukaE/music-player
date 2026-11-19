import { NextRequest, NextResponse } from "next/server";
import { Client, Account, Users, Databases, Query } from "node-appwrite";
import { verifyRecaptchaToken } from "@/lib/recaptcha";
import { sendAccountDeletedEmail } from "@/lib/mailer";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const ALBUMS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_ALBUMS_COLLECTION_ID ||
  "6afc282f0017c8a0bac5";

function createSessionClient(session: string) {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setSession(session);

  return { account: new Account(client) };
}

function createAdminClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  return {
    users: new Users(client),
    databases: new Databases(client),
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = request.cookies.get("appwrite-session")?.value;
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in first." },
        { status: 401 },
      );
    }

    const {
      username,
      email,
      password,
      captchaToken,
      deleteAlbums = false,
    } = await request.json();

    const isCaptchaValid = await verifyRecaptchaToken(captchaToken);
    if (!isCaptchaValid) {
      return NextResponse.json(
        { error: "Invalid or expired CAPTCHA. Please try again." },
        { status: 400 },
      );
    }

    if (!username || !email || !password) {
      return NextResponse.json(
        {
          error:
            "Username, email, and password are required to confirm deletion.",
        },
        { status: 400 },
      );
    }

    const { account } = createSessionClient(session);
    const { users, databases } = createAdminClient();
    const currentUser = await account.get();

    if (currentUser.name !== username || currentUser.email !== email) {
      return NextResponse.json(
        { error: "Provided username or email does not match your account." },
        { status: 403 },
      );
    }

    try {
      const verifyClient = new Client()
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);
      const verifyAccount = new Account(verifyClient);
      await verifyAccount.createEmailPasswordSession(email, password);
    } catch {
      return NextResponse.json(
        { error: "Incorrect password. Account deletion cancelled." },
        { status: 401 },
      );
    }

    // Optional: Delete all user-created albums if requested
    if (deleteAlbums === true) {
      let hasMore = true;
      while (hasMore) {
        const userAlbums = await databases.listDocuments(
          DATABASE_ID,
          ALBUMS_COLLECTION_ID,
          [Query.equal("creator", currentUser.$id), Query.limit(100)],
        );

        if (userAlbums.documents.length === 0) {
          hasMore = false;
          break;
        }

        await Promise.all(
          userAlbums.documents.map((doc) =>
            databases.deleteDocument(
              DATABASE_ID,
              ALBUMS_COLLECTION_ID,
              doc.$id,
            ),
          ),
        );

        if (userAlbums.documents.length < 100) {
          hasMore = false;
        }
      }
    }

    // Delete the user account from Appwrite Auth
    await users.delete(currentUser.$id);

    // Send "Sorry to See You Go" Email
    try {
      await sendAccountDeletedEmail(
        currentUser.email,
        currentUser.name,
        Boolean(deleteAlbums),
      );
    } catch (emailErr) {
      console.error("Failed to send farewell email:", emailErr);
    }

    const response = NextResponse.json(
      {
        message: deleteAlbums
          ? "Account and all associated albums deleted successfully."
          : "Account deleted successfully. Your public albums were left behind.",
      },
      { status: 200 },
    );
    response.cookies.delete("appwrite-session");

    return response;
  } catch (error: any) {
    const status = error?.code >= 400 && error?.code < 600 ? error.code : 500;
    return NextResponse.json(
      { error: error?.message || "Failed to delete account." },
      { status },
    );
  }
}
