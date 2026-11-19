import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID } from "node-appwrite";

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, artists, songs, private: isPrivate, creator } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Album title is required." },
        { status: 400 },
      );
    }

    if (!Array.isArray(songs) || songs.length === 0) {
      return NextResponse.json(
        { error: "An album must contain at least 1 song." },
        { status: 400 },
      );
    }

    if (songs.length > 25) {
      return NextResponse.json(
        { error: "An album can contain a maximum of 25 songs." },
        { status: 400 },
      );
    }

    if (!creator || typeof creator !== "string") {
      return NextResponse.json(
        { error: "Creator user ID is required." },
        { status: 401 },
      );
    }

    const databases = createAdminDatabases();

    const albumDoc = await databases.createDocument(
      DATABASE_ID,
      ALBUMS_COLLECTION_ID,
      ID.unique(),
      {
        title: title.trim(),
        artists: Array.isArray(artists) ? artists : [],
        songs, // Array of song document IDs ($id) from the "songs" table
        private: Boolean(isPrivate), // Default false (public)
        creator,
      },
    );

    return NextResponse.json(
      {
        message: "Album created successfully.",
        album: albumDoc,
      },
      { status: 201 },
    );
  } catch (error: any) {
    const status = error?.code >= 400 && error?.code < 600 ? error.code : 500;
    return NextResponse.json(
      { error: error?.message || "Failed to create album." },
      { status },
    );
  }
}
