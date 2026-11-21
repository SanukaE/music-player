import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, Storage, ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import crypto from "crypto";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function validateMp3Buffer(buffer: Buffer): {
  valid: boolean;
  reason?: string;
} {
  if (buffer.length < 16) {
    return { valid: false, reason: "File is too small to be a valid MP3." };
  }

  // Block common executable & archive signatures (MZ/PE, ELF, Mach-O, ZIP/JAR, PDF, HTML/Scripts)
  const hexHeader = buffer.subarray(0, 8).toString("hex").toLowerCase();
  if (hexHeader.startsWith("4d5a")) {
    return { valid: false, reason: "Executable files are not permitted." };
  }
  if (hexHeader.startsWith("7f454c46")) {
    return { valid: false, reason: "ELF binaries are not permitted." };
  }
  if (
    hexHeader.startsWith("feedface") ||
    hexHeader.startsWith("feedfacf") ||
    hexHeader.startsWith("cafebabe")
  ) {
    return { valid: false, reason: "Mach-O binaries are not permitted." };
  }
  if (hexHeader.startsWith("504b0304")) {
    return { valid: false, reason: "Archive files are not permitted." };
  }
  if (hexHeader.startsWith("25504446")) {
    return { valid: false, reason: "PDF documents are not permitted." };
  }

  // Verify valid ID3v2 tag ("ID3") or MPEG Audio Frame Sync (0xFF + 0xE0 mask)
  const hasId3 = buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33;
  const hasFrameSync = buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;

  if (!hasId3 && !hasFrameSync) {
    return {
      valid: false,
      reason: "Invalid MP3 signature. Please upload a standard MP3 audio file.",
    };
  }

  return { valid: true };
}

async function checkVirusTotalHash(
  buffer: Buffer,
): Promise<{ clean: boolean; reason?: string }> {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  if (!apiKey) return { clean: true };

  try {
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
    const res = await fetch(
      `https://www.virustotal.com/api/v3/files/${sha256}`,
      {
        headers: { "x-apikey": apiKey },
      },
    );

    if (res.status === 404) {
      // Unknown hash, not flagged
      return { clean: true };
    }

    if (res.ok) {
      const data = await res.json();
      const maliciousCount =
        data?.data?.attributes?.last_analysis_stats?.malicious ?? 0;
      if (maliciousCount > 0) {
        return {
          clean: false,
          reason: "Security scan flagged this file as potentially malicious.",
        };
      }
    }
  } catch (err) {
    console.warn("VirusTotal lookup skipped:", err);
  }

  return { clean: true };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const title = (formData.get("title") as string)?.trim();
    const rawArtists = (formData.get("artists") as string)?.trim();
    const file = formData.get("file") as File | null;

    if (!title || !rawArtists) {
      return NextResponse.json(
        { error: "Song title and at least one artist are required." },
        { status: 400 },
      );
    }

    const artists = rawArtists
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    if (artists.length === 0) {
      return NextResponse.json(
        { error: "Please provide at least one valid artist name." },
        { status: 400 },
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: "Please select an MP3 file to upload." },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File exceeds the 5MB maximum size limit." },
        { status: 413 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    const mp3Check = validateMp3Buffer(audioBuffer);
    if (!mp3Check.valid) {
      return NextResponse.json(
        { error: mp3Check.reason || "Invalid MP3 file." },
        { status: 400 },
      );
    }

    const vtCheck = await checkVirusTotalHash(audioBuffer);
    if (!vtCheck.clean) {
      return NextResponse.json(
        { error: vtCheck.reason || "File failed security screening." },
        { status: 422 },
      );
    }

    const client = new Client()
      .setEndpoint(
        process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
          "https://cloud.appwrite.io/v1",
      )
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!);

    const storage = new Storage(client);
    const databases = new Databases(client);

    const bucketId = process.env.NEXT_PUBLIC_APPWRITE_SONGS_BUCKET_ID!;
    const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const songsCollectionId =
      process.env.NEXT_PUBLIC_APPWRITE_SONGS_COLLECTION_ID!;

    const fileId = ID.unique();
    const safeFileName = `${title.replace(/[^a-zA-Z0-9-_]/g, "_")}.mp3`;

    const uploadedFile = await storage.createFile(
      bucketId,
      fileId,
      InputFile.fromBuffer(audioBuffer, safeFileName),
    );

    const songDoc = await databases.createDocument(
      databaseId,
      songsCollectionId,
      ID.unique(),
      {
        title,
        artist: artists,
        storageID: uploadedFile.$id,
      },
    );

    return NextResponse.json({ song: songDoc }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error uploading song:", error);
    const message =
      error instanceof Error ? error.message : "Failed to upload song.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
