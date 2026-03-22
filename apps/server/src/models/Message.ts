import { Schema, model, models, type InferSchemaType, type HydratedDocument } from "mongoose";

const reactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    emoji: { type: String, required: true }
  },
  { _id: false }
);

const messageSchema = new Schema(
  {
    chatId: { type: Schema.Types.ObjectId, ref: "Chat", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, default: "" },
    contentType: {
      type: String,
      enum: ["text", "image", "gif"],
      default: "text"
    },
    media: {
      url: String,
      publicId: String
    },
    replyToMessageId: { type: Schema.Types.ObjectId, ref: "Message" },
    moderation: {
      flagged: { type: Boolean, default: false },
      reasons: { type: [String], default: [] }
    },
    reactions: { type: [reactionSchema], default: [] },
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    editedAt: Date,
    deletedAt: Date
  },
  { timestamps: true }
);

export type IMessage = InferSchemaType<typeof messageSchema>;
export type IMessageDocument = HydratedDocument<IMessage>;
export const Message = models.Message || model("Message", messageSchema);

