import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, Users, Query } from "node-appwrite";
import { verifyRecaptchaToken } from "@/lib/recaptcha";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const ALBUMS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_ALBUMS_COLLECTION_ID ||
  "6afc282f0017c8a0bac5";
const SONGS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_SONGS_COLLECTION_ID ||
  "6afc0ce10018975476ab";
const SONGS_BUCKET_ID =
  process.env.NEXT_PUBLIC_APPWRITE_SONGS_BUCKET_ID || "6afbfb0000103d4c784d";

function createAdminServices() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  return {
    databases: new Databases(client),
    users: new Users(client),
  };
}

function buildAudioStreamUrl(storageID: string) {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
  const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
  return `${endpoint}/storage/buckets/${SONGS_BUCKET_ID}/files/${storageID}/view?project=${project}`;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId")?.trim() || "";

    const { databases, users } = createAdminServices();

    const albumDoc = await databases.getDocument(
      DATABASE_ID,
      ALBUMS_COLLECTION_ID,
      id,
    );

    // Block access if the album is private and the viewer is not the creator
    if (albumDoc.private && albumDoc.creator !== userId) {
      return NextResponse.json(
        { error: "This album is private." },
        { status: 403 },
      );
    }

    // Resolve creator display name
    let creatorName = "Unknown User";
    try {
      const creatorUser = await users.get(albumDoc.creator);
      creatorName = creatorUser.name || "Unknown User";
    } catch {
      // Fallback if user record is unavailable
    }

    // Resolve song documents in the exact order stored in albumDoc.songs
    const songIds: string[] = Array.isArray(albumDoc.songs)
      ? albumDoc.songs
      : [];

    let orderedSongs: any[] = [];
    if (songIds.length > 0) {
      const songsRes = await databases.listDocuments(
        DATABASE_ID,
        SONGS_COLLECTION_ID,
        [Query.equal("$id", songIds), Query.limit(25)],
      );

      const songMap = new Map(
        songsRes.documents.map((doc) => [
          doc.$id,
          {
            $id: doc.$id,
            title: doc.title,
            artist: Array.isArray(doc.artist)
              ? doc.artist
              : [String(doc.artist)],
            storageID: doc.storageID,
            audioUrl: buildAudioStreamUrl(doc.storageID),
          },
        ]),
      );

      orderedSongs = songIds
        .map((songId) => songMap.get(songId))
        .filter(Boolean);
    }

    return NextResponse.json(
      {
        album: {
          $id: albumDoc.$id,
          title: albumDoc.title,
          artists: Array.isArray(albumDoc.artists) ? albumDoc.artists : [],
          private: Boolean(albumDoc.private),
          creator: albumDoc.creator,
          creatorName,
          $createdAt: albumDoc.$createdAt,
          songs: orderedSongs,
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    const status = error?.code === 404 ? 404 : 500;
    return NextResponse.json(
      { error: error?.message || "Album not found." },
      { status },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { userId, title, artists, songs, private: isPrivate } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 },
      );
    }

    const { databases } = createAdminServices();
    const existingAlbum = await databases.getDocument(
      DATABASE_ID,
      ALBUMS_COLLECTION_ID,
      id,
    );

    if (existingAlbum.creator !== userId) {
      return NextResponse.json(
        { error: "Only the creator of this album can edit it." },
        { status: 403 },
      );
    }

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Album title cannot be empty." },
        { status: 400 },
      );
    }

    if (!Array.isArray(songs) || songs.length === 0 || songs.length > 25) {
      return NextResponse.json(
        { error: "An album must have between 1 and 25 songs." },
        { status: 400 },
      );
    }

    const updatedDoc = await databases.updateDocument(
      DATABASE_ID,
      ALBUMS_COLLECTION_ID,
      id,
      {
        title: title.trim(),
        artists: Array.isArray(artists) ? artists : [],
        songs, // Array of song $id strings in their new order
        private:
          typeof isPrivate === "boolean" ? isPrivate : existingAlbum.private,
      },
    );

    return NextResponse.json(
      { message: "Album updated successfully.", album: updatedDoc },
      { status: 200 },
    );
  } catch (error: any) {
    const status = error?.code >= 400 && error?.code < 600 ? error.code : 500;
    return NextResponse.json(
      { error: error?.message || "Failed to update album." },
      { status },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const { userId, captchaToken } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 },
      );
    }

    // Verify Google reCAPTCHA token before deleting the album
    const isCaptchaValid = await verifyRecaptchaToken(captchaToken);
    if (!isCaptchaValid) {
      return NextResponse.json(
        { error: "Invalid or expired CAPTCHA. Please try again." },
        { status: 400 },
      );
    }

    const { databases } = createAdminServices();
    const existingAlbum = await databases.getDocument(
      DATABASE_ID,
      ALBUMS_COLLECTION_ID,
      id,
    );

    if (existingAlbum.creator !== userId) {
      return NextResponse.json(
        { error: "Only the creator of this album can delete it." },
        { status: 403 },
      );
    }

    await databases.deleteDocument(DATABASE_ID, ALBUMS_COLLECTION_ID, id);

    return NextResponse.json(
      { message: "Album deleted successfully." },
      { status: 200 },
    );
  } catch (error: any) {
    const status = error?.code >= 400 && error?.code < 600 ? error.code : 500;
    return NextResponse.json(
      { error: error?.message || "Failed to delete album." },
      { status },
    );
  }
}
