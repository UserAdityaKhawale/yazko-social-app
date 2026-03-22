import { Schema, model, models, type InferSchemaType, type HydratedDocument } from "mongoose";

const chatSchema = new Schema(
  {
    type: { type: String, enum: ["private", "group"], required: true },
    name: { type: String, trim: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    lastMessage: {
      body: String,
      senderId: { type: Schema.Types.ObjectId, ref: "User" },
      createdAt: Date
    }
  },
  { timestamps: true }
);

export type IChat = InferSchemaType<typeof chatSchema>;
export type IChatDocument = HydratedDocument<IChat>;
export const Chat = models.Chat || model("Chat", chatSchema);

