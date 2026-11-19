import { Client, Account } from "appwrite";

const endpoint =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  "https://syd.cloud.appwrite.io/v1";
const projectId =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "6af97174003565e9646a";

const client = new Client().setEndpoint(endpoint).setProject(projectId);

export const account = new Account(client);
