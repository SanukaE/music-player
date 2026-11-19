import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, Users, Query } from "node-appwrite";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const ALBUMS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_ALBUMS_COLLECTION_ID ||
  "6afc282f0017c8a0bac5";

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const filter = searchParams.get("filter") || "All";
    const userId = searchParams.get("userId")?.trim() || "";

    const { databases, users } = createAdminServices();

    // 1. Fetch albums (Public albums OR Private albums owned by the current user)
    let rawAlbums: any[] = [];

    if (userId) {
      const [publicRes, ownPrivateRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, ALBUMS_COLLECTION_ID, [
          Query.equal("private", false),
          Query.orderDesc("$createdAt"),
          Query.limit(100),
        ]),
        databases.listDocuments(DATABASE_ID, ALBUMS_COLLECTION_ID, [
          Query.equal("private", true),
          Query.equal("creator", userId),
          Query.orderDesc("$createdAt"),
          Query.limit(100),
        ]),
      ]);

      // Merge and deduplicate by $id
      const map = new Map<string, any>();
      for (const doc of [...ownPrivateRes.documents, ...publicRes.documents]) {
        map.set(doc.$id, doc);
      }
      rawAlbums = Array.from(map.values());
    } else {
      const publicRes = await databases.listDocuments(
        DATABASE_ID,
        ALBUMS_COLLECTION_ID,
        [
          Query.equal("private", false),
          Query.orderDesc("$createdAt"),
          Query.limit(100),
        ],
      );
      rawAlbums = publicRes.documents;
    }

    // Double-check privacy enforcement in memory
    const accessibleAlbums = rawAlbums.filter(
      (doc) => doc.private === false || (userId && doc.creator === userId),
    );

    // 2. Resolve creator IDs to usernames so users can see & search by creator
    const uniqueCreatorIds = Array.from(
      new Set(accessibleAlbums.map((doc) => doc.creator).filter(Boolean)),
    );

    const creatorMap: Record<string, string> = {};
    await Promise.all(
      uniqueCreatorIds.map(async (creatorId) => {
        try {
          const user = await users.get(creatorId);
          creatorMap[creatorId] = user.name || "Unknown User";
        } catch {
          creatorMap[creatorId] = "Unknown User";
        }
      }),
    );

    // 3. Format albums
    let formattedAlbums = accessibleAlbums.map((doc) => ({
      $id: doc.$id,
      title: doc.title || "Untitled Album",
      artists: Array.isArray(doc.artists) ? doc.artists : [],
      songs: Array.isArray(doc.songs) ? doc.songs : [],
      private: Boolean(doc.private),
      creator: doc.creator,
      creatorName: creatorMap[doc.creator] || doc.creator,
      $createdAt: doc.$createdAt,
    }));

    // 4. Filter by search query if provided
    if (q) {
      const queryLower = q.toLowerCase().replace(/^@/, "");
      const tokens = queryLower.split(/\s+/).filter(Boolean);

      formattedAlbums = formattedAlbums.filter((album) => {
        const idLower = album.$id.toLowerCase();
        const titleLower = album.title.toLowerCase();
        const artistsLower = album.artists.join(" ").toLowerCase();
        const creatorLower = album.creatorName.toLowerCase();
        const creatorIdLower = (album.creator || "").toLowerCase();

        if (filter === "UUID") {
          return idLower.includes(queryLower);
        }
        if (filter === "Album") {
          return (
            titleLower.includes(queryLower) ||
            tokens.some((t) => titleLower.includes(t))
          );
        }
        if (filter === "User") {
          return (
            creatorLower.includes(queryLower) ||
            creatorIdLower.includes(queryLower)
          );
        }
        if (filter === "Song") {
          return (
            artistsLower.includes(queryLower) ||
            titleLower.includes(queryLower) ||
            album.songs.some((sId: string) =>
              sId.toLowerCase().includes(queryLower),
            )
          );
        }

        // "All" filter: match across UUID, Album Title, Artists, or Creator
        return (
          idLower.includes(queryLower) ||
          titleLower.includes(queryLower) ||
          artistsLower.includes(queryLower) ||
          creatorLower.includes(queryLower) ||
          tokens.some(
            (t) =>
              titleLower.includes(t) ||
              artistsLower.includes(t) ||
              creatorLower.includes(t),
          )
        );
      });
    }

    return NextResponse.json({ albums: formattedAlbums }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch albums." },
      { status: 500 },
    );
  }
}
