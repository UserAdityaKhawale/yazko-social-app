import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });
dotenv.config();

export const env = {
  port: Number(process.env.SERVER_PORT ?? 4000),
  mongoUri: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/yazko",
  jwtSecret: process.env.JWT_SECRET ?? "change-me",
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:3000",
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY ?? "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? ""
};

