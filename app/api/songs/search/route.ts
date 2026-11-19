import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, Query } from "node-appwrite";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const SONGS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_SONGS_COLLECTION_ID!;
const SONGS_BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_SONGS_BUCKET_ID!;

function createAdminDatabases() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  return new Databases(client);
}

function buildAudioStreamUrl(storageID: string) {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
  const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
  return `${endpoint}/storage/buckets/${SONGS_BUCKET_ID}/files/${storageID}/view?project=${project}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";

    if (!q) {
      return NextResponse.json(
        { songs: [], matchType: "none" },
        { status: 200 },
      );
    }

    const databases = createAdminDatabases();

    // 1. Check for exact or direct full-text matches first
    let exactMatch = true;
    let documents: any[] = [];

    try {
      const primaryResult = await databases.listDocuments(
        DATABASE_ID,
        SONGS_COLLECTION_ID,
        [Query.search("title", q), Query.limit(15)],
      );
      documents = primaryResult.documents;
    } catch {
      // Fallback if fulltext index isn't configured on `title` yet
      const fallbackResult = await databases.listDocuments(
        DATABASE_ID,
        SONGS_COLLECTION_ID,
        [Query.contains("title", q), Query.limit(15)],
      );
      documents = fallbackResult.documents;
    }

    // 2. If no direct match, find best matches across title words & artist array
    if (documents.length === 0) {
      exactMatch = false;
      const recentPool = await databases.listDocuments(
        DATABASE_ID,
        SONGS_COLLECTION_ID,
        [Query.limit(100), Query.orderDesc("$createdAt")],
      );

      const tokens = q
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length >= 2);

      const scored = recentPool.documents
        .map((doc) => {
          const titleLower = (doc.title || "").toLowerCase();
          const artistsLower = Array.isArray(doc.artist)
            ? doc.artist.join(" ").toLowerCase()
            : "";

          let score = 0;
          if (titleLower.includes(q.toLowerCase())) score += 5;
          if (artistsLower.includes(q.toLowerCase())) score += 4;

          for (const token of tokens) {
            if (titleLower.includes(token)) score += 2;
            if (artistsLower.includes(token)) score += 1;
          }

          return { doc, score };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map((item) => item.doc);

      documents = scored;
    }

    const songs = documents.map((doc) => ({
      $id: doc.$id,
      title: doc.title,
      artist: Array.isArray(doc.artist) ? doc.artist : [String(doc.artist)],
      storageID: doc.storageID,
      audioUrl: buildAudioStreamUrl(doc.storageID),
    }));

    return NextResponse.json(
      {
        songs,
        matchType: songs.length === 0 ? "none" : exactMatch ? "exact" : "best",
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to search songs." },
      { status: 500 },
    );
  }
}
