import mongoose, { Schema, models } from "mongoose";

const coinTransactionSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      validate: {
        validator: (v) => v !== 0,
        message: "Coin transaction amount cannot be zero",
      },
    },
    type: {
      type: String,
      enum: ["earned_vote", "spent_ask", "daily_login", "bonus", "admin_grant", "refund"],
      required: true,
    },
    referenceModel: {
      // The model the referenceId belongs to — required for populate()
      type: String,
      enum: ["AskDilemma", "AskVote"],
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "referenceModel",
    },
    description: {
      type: String,
    }
  },
  { timestamps: true }
);

const CoinTransaction = models.CoinTransaction || mongoose.model("CoinTransaction", coinTransactionSchema);

export default CoinTransaction;
