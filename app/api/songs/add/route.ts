import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, Storage, ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { create as createYTDlp } from "yt-dlp-exec";
import fsSync from "fs";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";

let tempCookiesPath: string | null = null;

const execFileAsync = promisify(execFile);

const ytDlpBinary = fsSync.existsSync("/usr/local/bin/yt-dlp")
  ? "/usr/local/bin/yt-dlp"
  : "yt-dlp";

const YTDlpWrap = createYTDlp(ytDlpBinary);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB strict limit
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
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
    storage: new Storage(client),
  };
}

/**
 * Multi-layer Virus & Malicious Payload Check
 * 1. EICAR test signature & embedded executable header detection (MZ/PE, ELF, Mach-O, PHP/Shell scripts)
 * 2. Valid MP3 magic-byte verification (ID3v2 tag or MPEG audio frame sync)
 * 3. Optional ClamAV (`clamscan`) or VirusTotal SHA-256 hash lookup if configured
 */
async function scanAudioBufferForViruses(
  buffer: Buffer,
  filePath?: string,
): Promise<{ safe: boolean; reason?: string }> {
  // 1. Check EICAR standard antivirus test string
  const asciiSample = buffer.subarray(0, 4096).toString("utf8");
  if (
    asciiSample.includes(
      "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*",
    )
  ) {
    return { safe: false, reason: "EICAR virus signature detected." };
  }

  // 2. Reject disguised Windows/Linux/macOS executables or script payloads
  const magic2 = buffer.subarray(0, 2).toString("utf8");
  const magic4 = buffer.subarray(0, 4);
  if (
    magic2 === "MZ" || // Windows PE / EXE / DLL
    magic4.equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46])) || // Linux ELF binary
    magic4.equals(Buffer.from([0xfe, 0xed, 0xfa, 0xce])) || // Mach-O 32-bit
    magic4.equals(Buffer.from([0xfe, 0xed, 0xfa, 0xcf])) || // Mach-O 64-bit
    asciiSample.startsWith("#!/") ||
    asciiSample.toLowerCase().startsWith("<?php") ||
    asciiSample.toLowerCase().startsWith("<script")
  ) {
    return {
      safe: false,
      reason: "File contains executable or script code disguised as audio.",
    };
  }

  // 3. Verify MP3 Magic Bytes (ID3 header `49 44 33` or MPEG frame sync `FF FB` / `FF F3` / `FF F2` / `FF FA`)
  const isID3 = buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33;
  const isMpegSync = buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;
  if (!isID3 && !isMpegSync) {
    return {
      safe: false,
      reason: "Invalid MP3 file header. Only genuine MP3 audio is permitted.",
    };
  }

  // 4. Optional local ClamAV scan if installed on server
  if (filePath && process.env.CLAMSCAN_PATH) {
    try {
      await execFileAsync(process.env.CLAMSCAN_PATH, [
        "--no-summary",
        filePath,
      ]);
    } catch {
      return {
        safe: false,
        reason: "Threat detected by ClamAV antivirus scanner.",
      };
    }
  }

  // 5. Optional VirusTotal SHA-256 hash reputation check
  if (process.env.VIRUSTOTAL_API_KEY) {
    try {
      const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
      const vtRes = await fetch(
        `https://www.virustotal.com/api/v3/files/${sha256}`,
        {
          headers: { "x-apikey": process.env.VIRUSTOTAL_API_KEY },
        },
      );

      if (vtRes.ok) {
        const vtData = await vtRes.json();
        const maliciousCount =
          vtData?.data?.attributes?.last_analysis_stats?.malicious || 0;
        if (maliciousCount > 0) {
          return {
            safe: false,
            reason: `File flagged as malicious by ${maliciousCount} security vendors.`,
          };
        }
      }
    } catch {
      // Proceed if VirusTotal lookup is unreachable
    }
  }

  return { safe: true };
}

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;

  try {
    const formData = await request.formData();
    const mode = formData.get("mode") as "url" | "file";
    const title = (formData.get("title") as string)?.trim();
    const artistsRaw = formData.get("artists") as string;

    if (!title) {
      return NextResponse.json(
        { error: "Song title is required." },
        { status: 400 },
      );
    }

    let artists: string[] = [];
    try {
      artists = JSON.parse(artistsRaw);
    } catch {
      artists = artistsRaw
        ? artistsRaw
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean)
        : [];
    }

    if (artists.length === 0) {
      return NextResponse.json(
        { error: "At least one artist is required." },
        { status: 400 },
      );
    }

    let audioBuffer: Buffer;

    // ================= MODE A: MP3 FILE UPLOAD =================
    if (mode === "file") {
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json(
          { error: "Please select an MP3 file to upload." },
          { status: 400 },
        );
      }

      if (
        !file.name.toLowerCase().endsWith(".mp3") &&
        file.type !== "audio/mpeg"
      ) {
        return NextResponse.json(
          { error: "Only .mp3 audio files are supported." },
          { status: 400 },
        );
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: "MP3 file exceeds the 5MB maximum size limit." },
          { status: 413 },
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      audioBuffer = Buffer.from(arrayBuffer);

      tempFilePath = path.join(os.tmpdir(), `upload-${ID.unique()}.mp3`);
      await fs.writeFile(tempFilePath, audioBuffer);
    }
    // ================= MODE B: URL DOWNLOAD VIA YT-DLP =================
    else if (mode === "url") {
      const sourceUrl = (formData.get("url") as string)?.trim();
      if (!sourceUrl) {
        return NextResponse.json(
          { error: "Please provide a valid song URL." },
          { status: 400 },
        );
      }

      try {
        new URL(sourceUrl);
      } catch {
        return NextResponse.json(
          { error: "Invalid URL format." },
          { status: 400 },
        );
      }

      const uniqueId = ID.unique();
      const outputTemplate = path.join(
        os.tmpdir(),
        `ytdlp-${uniqueId}.%(ext)s`,
      );
      tempFilePath = path.join(os.tmpdir(), `ytdlp-${uniqueId}.mp3`);
      let tempCookiesPath: string | null = null;

      try {
        const ytdlpOptions: Record<string, any> = {
          extractAudio: true,
          audioFormat: "mp3",
          audioQuality: 5,
          maxFilesize: "5M",
          noPlaylist: true,
          jsRuntimes: "node",
          output: outputTemplate,
        };

        if (process.env.YOUTUBE_COOKIES_BASE64) {
          tempCookiesPath = path.join(
            os.tmpdir(),
            `yt-cookies-${Date.now()}.txt`,
          );
          const decodedCookies = Buffer.from(
            process.env.YOUTUBE_COOKIES_BASE64,
            "base64",
          ).toString("utf-8");
          await fs.writeFile(tempCookiesPath, decodedCookies, "utf-8");
          ytdlpOptions.cookies = tempCookiesPath;
        }

        await YTDlpWrap(sourceUrl, ytdlpOptions);
      } finally {
        if (tempCookiesPath) {
          await fs.unlink(tempCookiesPath).catch(() => {});
        }
      }

      const stats = await fs.stat(tempFilePath).catch(() => null);
      if (!stats) {
        return NextResponse.json(
          {
            error: "Could not extract an MP3 under 5MB from the provided URL.",
          },
          { status: 422 },
        );
      }

      if (stats.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: "Downloaded audio exceeds the 5MB maximum file size." },
          { status: 413 },
        );
      }

      audioBuffer = await fs.readFile(tempFilePath);
    } else {
      return NextResponse.json(
        { error: "Invalid upload mode. Must be 'url' or 'file'." },
        { status: 400 },
      );
    }

    // ================= VIRUS CHECK BEFORE STORAGE =================
    const scanResult = await scanAudioBufferForViruses(
      audioBuffer,
      tempFilePath || undefined,
    );

    if (!scanResult.safe) {
      return NextResponse.json(
        {
          error: `Security check failed: ${
            scanResult.reason || "Malicious file blocked."
          }`,
        },
        { status: 422 },
      );
    }

    // ================= SAVE TO APPWRITE STORAGE & DB =================
    const { storage, databases } = createAdminServices();
    const safeFilename = `${title
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()}.mp3`;

    const uploadedFile = await storage.createFile(
      SONGS_BUCKET_ID,
      ID.unique(),
      InputFile.fromBuffer(audioBuffer, safeFilename),
    );

    const songDoc = await databases.createDocument(
      DATABASE_ID,
      SONGS_COLLECTION_ID,
      ID.unique(),
      {
        title,
        artist: artists,
        storageID: uploadedFile.$id,
      },
    );

    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
    const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;

    return NextResponse.json(
      {
        message: "Song verified and saved to Appwrite.",
        song: {
          $id: songDoc.$id,
          title: songDoc.title,
          artist: songDoc.artist,
          storageID: songDoc.storageID,
          audioUrl: `${endpoint}/storage/buckets/${SONGS_BUCKET_ID}/files/${songDoc.storageID}/view?project=${project}`,
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to add song." },
      { status: 500 },
    );
  } finally {
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(() => {});
    }
  }
}
