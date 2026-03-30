import { Schema, model, models, type InferSchemaType, type HydratedDocument } from "mongoose";

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    firstName: { type: String, trim: true, default: "" },
    lastName: { type: String, trim: true, default: "" },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    googleId: { type: String },
    avatar: {
      type: String,
      default:
        "https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&w=400&q=80"
    },
    bio: { type: String, default: "Here for the vibes." },
    mood: { type: String, default: "online" }
  },
  { timestamps: true }
);

export type IUser = InferSchemaType<typeof userSchema>;
export type IUserDocument = HydratedDocument<IUser>;
export const User = models.User || model("User", userSchema);
