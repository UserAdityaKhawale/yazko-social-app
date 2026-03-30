import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });
dotenv.config();

type NodeEnv = "development" | "test" | "production";

function normalizeNodeEnv(value?: string): NodeEnv {
  if (value === "production" || value === "test") {
    return value;
  }

  return "development";
}

function requireInProduction(name: string, value: string, nodeEnv: NodeEnv) {
  if (nodeEnv === "production" && !value.trim()) {
    throw new Error(`${name} is required in production.`);
  }

  return value;
}

function parseOrigins(input: string) {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const nodeEnv = normalizeNodeEnv(process.env.NODE_ENV);
const isProduction = nodeEnv === "production";
const clientOrigins = parseOrigins(process.env.CLIENT_URL ?? "http://localhost:3000");
const jwtSecret = process.env.JWT_SECRET ?? "change-me";

if (isProduction && jwtSecret === "change-me") {
  throw new Error("JWT_SECRET must be changed for production.");
}

export const env = {
  nodeEnv,
  isProduction,
  port: Number(process.env.SERVER_PORT ?? 4000),
  mongoUri: requireInProduction("MONGODB_URI", process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/yazko", nodeEnv),
  jwtSecret,
  clientOrigins,
  primaryClientUrl: clientOrigins[0] ?? "http://localhost:3000",
  serverPublicUrl: process.env.SERVER_PUBLIC_URL ?? `http://localhost:${process.env.SERVER_PORT ?? 4000}`,
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY ?? "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  logLevel: process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug")
};
