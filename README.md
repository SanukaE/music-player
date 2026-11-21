# Music Player

A full-stack Next.js and Appwrite web application for curating, searching, and sharing music albums via unique UUIDs. Built with TypeScript, Tailwind CSS, Appwrite Auth/Databases/Storage, Google reCAPTCHA, and Nodemailer.

---

## Features

- **Album Discovery & UUID Lookup:** Search public albums by title, artist, creator username, or paste an Album UUID directly into the search bar. Private albums are automatically filtered out unless viewed by their creator.
- **2-Step Album Studio (Up to 25 Songs):**
  - Search existing tracks stored on the server with inline audio previews before adding them to a draft album.
  - Upload missing tracks via **MP3 file upload (5 MB max)** with multi-artist tagging.
  - Multi-layer security and magic-byte virus scanning before any file is written to Appwrite Storage.
  - Auto-populates album artists from selected tracks and lets creators choose between **Public** and **Private** visibility.
- **Full Album Audio Player & Creator Controls:**
  - Play, pause, seek, skip tracks, and auto-advance through an album's tracklist.
  - One-click **Copy Album ID** modal with a voluntary Stripe donation option.
  - In-page **Album Settings** for creators to update album titles, edit artist tags, toggle visibility, add/remove songs, and reorder tracks.
- **Creator Library (`My Albums`):** View all public and private albums created by your account, manage settings, copy UUIDs, or delete albums (protected by Google reCAPTCHA).
- **Authentication & Account Management:**
  - Sign Up (`Start Creating`) with live username/email availability checks, password strength meter, Google reCAPTCHA, and Terms/Privacy consent.
  - Sign In with live email registration lookup and Google reCAPTCHA.
  - Email verification and password recovery flows powered by Appwrite.
  - Account Settings to update username, email, or password (with current password verification), instant logout, and account deletion with an option to leave created albums behind or delete them together.
- **Transactional Emails:** Dark-mode HTML emails sent via Nodemailer on account creation (_Welcome Aboard_), account updates (_Security Alert_), and account deletion (_Sorry to See You Go_).

---

## Tech Stack

- **Framework:** Next.js (App Router), React, TypeScript
- **Styling:** Tailwind CSS, Lucide Icons
- **Backend & Storage:** Appwrite (`appwrite` client SDK & `node-appwrite` server SDK)
- **Security:** Google reCAPTCHA v2 (`react-google-recaptcha`), MP3 magic-byte & executable header inspection, optional ClamAV / VirusTotal hash checks
- **Emails:** Nodemailer (SMTP)

---

## Prerequisites

Before running the project locally, make sure you have:

1. **Node.js** (v18 or newer)
2. An **Appwrite Cloud** or self-hosted Appwrite project.
3. **Google reCAPTCHA v2 ("I'm not a robot" Checkbox)** site and secret keys.

---

## Appwrite Backend Setup

Create a database and storage bucket in your Appwrite Console matching the schema below:

### 1. Storage Bucket

- **Bucket ID:** `6afbfb0000103d4c784d` (or set your own in `.env.local`)
- **Allowed File Extensions:** `mp3`
- **Max File Size:** `5 MB` (`5242880` bytes)
- **Permissions:** Grant read access to `any` so audio streams can play in the browser.

### 2. Database Collections

#### `songs` Collection (`6afc0ce10018975476ab`)

| Attribute   | Type             | Required | Notes                                                   |
| :---------- | :--------------- | :------- | :------------------------------------------------------ |
| `title`     | String           | Yes      | Song title (add a Fulltext index on `title` for search) |
| `artist`    | String[] (Array) | Yes      | List of artist names                                    |
| `storageID` | String           | Yes      | File ID from the Appwrite Storage bucket                |

#### `albums` Collection (`6afc282f0017c8a0bac5`)

| Attribute | Type             | Required | Notes                                                        |
| :-------- | :--------------- | :------- | :----------------------------------------------------------- |
| `title`   | String           | Yes      | Album title                                                  |
| `artists` | String[] (Array) | Yes      | Auto-collected or custom album artists                       |
| `songs`   | String[] (Array) | Yes      | Ordered array of document `$id`s from the `songs` collection |
| `private` | Boolean          | Yes      | `false` = Public, `true` = Private                           |
| `creator` | String           | Yes      | Appwrite User ID (`$id`) of the creator                      |

### 3. API Key & Web Platform

- Under **Settings → Platforms**, add a **Web** platform with hostname `localhost` (and your production domain when deploying).
- Under **Overview → Integrations → API Keys**, create a server API key with `users.read`, `users.write`, `documents.read`, `documents.write`, `files.read`, and `files.write` scopes.

---

## Getting Started

### 1. Clone the Repository

```bash
git clone [https://github.com/SanukaE/music-player.git](https://github.com/SanukaE/music-player.git)
cd music-player
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory and populate it with your credentials:

```
# Appwrite Configuration

NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_appwrite_project_id
APPWRITE_API_KEY=your_appwrite_server_api_key

# Appwrite Database & Storage IDs

NEXT_PUBLIC_APPWRITE_DATABASE_ID=your_appwrite_database_id
NEXT_PUBLIC_APPWRITE_SONGS_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_SONGS_BUCKET_ID=
NEXT_PUBLIC_APPWRITE_ALBUMS_COLLECTION_ID=

# App URL (used in transactional email links)

NEXT_PUBLIC_APP_URL=http://localhost:3000

# Google reCAPTCHA v2 Keys

NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key

# Nodemailer SMTP Configuration (e.g. Gmail App Password)

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM="Music Player <your_email@gmail.com>"

# Optional: External Antivirus Scanners

VIRUSTOTAL_API_KEY=rguihreuighriu
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

## License

This project is open source and available under the MIT License.
