import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, Query } from "node-appwrite";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const ALBUMS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_ALBUMS_COLLECTION_ID ||
  "6afc282f0017c8a0bac5";

function createAdminDatabases() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  return new Databases(client);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId")?.trim();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. User ID is required." },
        { status: 401 },
      );
    }

    const databases = createAdminDatabases();

    const res = await databases.listDocuments(
      DATABASE_ID,
      ALBUMS_COLLECTION_ID,
      [
        Query.equal("creator", userId),
        Query.orderDesc("$createdAt"),
        Query.limit(100),
      ],
    );

    const albums = res.documents.map((doc) => ({
      $id: doc.$id,
      title: doc.title || "Untitled Album",
      artists: Array.isArray(doc.artists) ? doc.artists : [],
      songs: Array.isArray(doc.songs) ? doc.songs : [],
      private: Boolean(doc.private),
      creator: doc.creator,
      $createdAt: doc.$createdAt,
    }));

    return NextResponse.json({ albums }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load your albums." },
      { status: 500 },
    );
  }
}
