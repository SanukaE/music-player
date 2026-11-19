import { NextRequest, NextResponse } from "next/server";
import { Client, Account, Users, Query } from "node-appwrite";
import { sendAccountUpdatedEmail } from "@/lib/mailer";

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

  return { users: new Users(client) };
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

    const { currentPassword, username, email, password } = await request.json();

    if (!currentPassword) {
      return NextResponse.json(
        { error: "Current password is required to make account changes." },
        { status: 400 },
      );
    }

    if (!username && !email && !password) {
      return NextResponse.json(
        {
          error:
            "Provide at least one field to update (username, email, or password).",
        },
        { status: 400 },
      );
    }

    const { account } = createSessionClient(session);
    const { users } = createAdminClient();
    const currentUser = await account.get();

    // Verify currentPassword explicitly
    try {
      const verifyClient = new Client()
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);
      const verifyAccount = new Account(verifyClient);
      const tempSession = await verifyAccount.createEmailPasswordSession(
        currentUser.email,
        currentPassword,
      );
      await users.deleteSession(currentUser.$id, tempSession.$id);
    } catch {
      return NextResponse.json(
        { error: "The current password you entered is incorrect." },
        { status: 401 },
      );
    }

    const updatedFields: string[] = [];

    if (username && username.trim() !== currentUser.name) {
      const existingUsername = await users.list([
        Query.equal("name", username.trim()),
      ]);
      if (existingUsername.total > 0) {
        return NextResponse.json(
          { error: "This username is already taken." },
          { status: 409 },
        );
      }
      await account.updateName(username.trim());
      updatedFields.push("username");
    }

    if (email && email.trim() !== currentUser.email) {
      const existingEmail = await users.list([
        Query.equal("email", email.trim()),
      ]);
      if (existingEmail.total > 0) {
        return NextResponse.json(
          { error: "This email is already in use." },
          { status: 409 },
        );
      }
      await account.updateEmail(email.trim(), currentPassword);
      updatedFields.push("email");
    }

    if (password) {
      if (password.length < 8) {
        return NextResponse.json(
          { error: "New password must be at least 8 characters long." },
          { status: 400 },
        );
      }
      await account.updatePassword(password, currentPassword);
      updatedFields.push("password");
    }

    // Send "Account Details Updated" security email
    if (updatedFields.length > 0) {
      try {
        const targetEmail = email?.trim() || currentUser.email;
        const targetName = username?.trim() || currentUser.name;
        await sendAccountUpdatedEmail(targetEmail, targetName, updatedFields);
      } catch (emailErr) {
        console.error("Failed to send account update email:", emailErr);
      }
    }

    return NextResponse.json(
      {
        message: "Account updated successfully.",
        updatedFields,
      },
      { status: 200 },
    );
  } catch (error: any) {
    const status = error?.code >= 400 && error?.code < 600 ? error.code : 500;
    return NextResponse.json(
      { error: error?.message || "Failed to update account." },
      { status },
    );
  }
}
