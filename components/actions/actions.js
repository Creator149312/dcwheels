"use server";
import { getServerSession } from "next-auth";
import { connectMongoDB } from "@lib/mongodb";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import User from "@models/user";
import EmailVerificationToken from "@models/emailverificationtoken";
import PasswordReset from "@models/passwordreset";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import Page from "@models/page";
import mongoose from "mongoose";
import {
  validatePassword,
  validateUsername,
  validateEmail,
} from "@utils/Validator";
import Wheel from "@models/wheel";
import { Resend } from "resend";
import Registration from "@app/email/registration";
import uuid4 from "uuid4";
import PasswordResetEmail from "@app/email/PasswordResetEmail";
import {
  ensureArrayOfObjects,
  replaceUnderscoreWithDash,
} from "@utils/HelperFunctions";
import Reaction from "@models/reaction";
import Follow from "@models/follow";
import Comment from "@models/comment";
import WheelAnalytics from "@models/wheelAnalytics";
import apiConfig from "@utils/ApiUrlConfig";
import { OpenAI } from "openai";
import ApiLog from "@models/apilogs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure to set your API key in environment variables
});

//this method is used when user is logged in
export const updateNewPassword = async (formData) => {
  let errorData = { error: "" };
  const session = await getServerSession(authOptions);

  // Validate all three password fields and surface the FIRST error. The
  // previous implementation overwrote `errorData.error` on each line, so a
  // bad currentPassword or newPassword was silently discarded if the
  // retypeNewPassword check happened to pass, and vice versa.
  const current = formData.get("currentPassword");
  const next = formData.get("newPassword");
  const retype = formData.get("retypeNewPassword");

  errorData.error =
    validatePassword(current) ||
    validatePassword(next) ||
    validatePassword(retype) ||
    (next !== retype ? "Passwords do not match" : "");

  if (errorData.error.length !== 0) {
    return errorData;
  }
  let ifPasswordsMatch = false;
  try {
    if (session && errorData.error.length === 0) {
      await connectMongoDB();
      // Use findOne + lean-ish path — the previous `User.find().[0]` loaded
      // an array only to throw the rest away, and masked a "no such user"
      // situation as a crash (userData[0].password on undefined).
      const userData = await User.findOne({ email: session.user.email });
      if (!userData) {
        return { error: "User not found" };
      }

      ifPasswordsMatch = await bcrypt.compare(current, userData.password);
      const newhashedPassword = await bcrypt.hash(next, 10);

      if (ifPasswordsMatch) {
        const filter = { email: session.user.email };
        const update = { password: newhashedPassword };
        await User.findOneAndUpdate(filter, update);
      } else {
        return {
          error: "Please enter the correct Password!",
        };
      }
    } else {
      //send error message to client
      return {
        error: "Please login to change Password!",
      };
    }
  } catch (error) {
    return { error: "Error resetting password" };
  }

  // if (ifPasswordsMatch) {
  //   redirect("/login");
  // }
};

//this method is used when user has forgot his current password
export const updateNewPasswordbyToken = async (formData, token) => {
  let errorData = { error: "" };
  await connectMongoDB();
  let record = await PasswordReset.findOne({ token: token });

  if (record) {
    errorData.error = validatePassword(formData.get("newPassword"));
    errorData.error = validatePassword(formData.get("retypeNewPassword"));

    if (formData.get("newPassword") !== formData.get("retypeNewPassword"))
      errorData.error = "Passwords do not match";

    if (errorData.error.length !== 0) {
      return {
        error: errorData.error,
      };
    }

    try {
      if (errorData.error.length === 0) {
        await connectMongoDB();

        const newhashedPassword = await bcrypt.hash(
          formData.get("newPassword"),
          10
        );

        const filter = { email: record.email };
        const update = { password: newhashedPassword };
        await User.findOneAndUpdate(filter, update);
        await PasswordReset.deleteOne({ email: record.email });
      } else {
        //send error message to client
        return {
          error: "Please login to change Password!",
        };
      }
    } catch (error) {
      // console.log(error);
      return { error: "Error resetting password" };
    }
  } else {
    return { error: "InValid Password Reset Request" };
  }

  // if (ifPasswordsMatch) {
  //   redirect("/login");
  // }
};

export const deleteUserAccount = async (formData) => {
  const session = await getServerSession(authOptions);
  try {
    if (session) {
      //delete user record from database
      const result = await User.deleteOne({ email: session.user.email });
    }
  } catch (error) {
    return { error: "Please login to delete your Account" };
  }

  // if (isUserDeleted) {
  //   redirect("/login");
  // }
};

const getVerificationTokenByEmail = async (email) => {
  try {
    const result = await EmailVerificationToken.findOne({ email: email });
  } catch (error) {
    return { error: "Please login to delete your Account" };
  }
};

const deleteExistingTokenByEmail = async (email) => {
  try {
    const result = await EmailVerificationToken.findOneAndDelete({
      email: email,
    });
  } catch (error) {
    return { error: "Please login to delete your Account" };
  }
};

const sendAccountVerificationEmail = async (email, token) => {
  const resend = new Resend(process.env.EMAIL_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: "Spinpapa <onboarding@spinpapa.com>",
      to: [`${email}`],
      subject: "Account Verification",
      react: <Registration email={email} token={token} />,
    });
  } catch (error) {
    return { error: "Failed to send account verification email" };
  }
};

const sendPasswordResetLinkEmail = async (email, token) => {
  const resend = new Resend(process.env.EMAIL_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: "Spinpapa <onboarding@spinpapa.com>",
      to: [`${email}`],
      subject: "Password Reset Request",
      react: <PasswordResetEmail email={email} token={token} />,
    });
  } catch (error) {
    return { error: "Failed to send account verification email" };
  }
};

export const registerUser = async (formData) => {
  let errorData = { error: "" };

  let vu = validateUsername(formData.get("username"));
  let ve = validateEmail(formData.get("email"));
  let vp = validatePassword(formData.get("password"));

  if (vu.length !== 0) errorData.error = vu;
  if (ve.length !== 0) errorData.error = ve;
  if (vp.length !== 0) errorData.error = vp;

  try {
    if (errorData.error.length !== 0) {
      return { error: errorData };
    }

    await connectMongoDB();

    let email = formData.get("email");
    let name = formData.get("username");
    let password = formData.get("password");

    const user = await User.findOne({ email }).select("_id");
    const userName = await User.findOne({ name }).select("_id");

    if (user) {
      return {
        error: "User already exists!",
      };
    } else if (userName) {
      return {
        error: "Username is already taken!",
      };
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      let res = await User.create({
        name,
        email,
        password: hashedPassword,
        authMethod: "emailPassword",
      });

      let timeNow = new Date();
      // let expriringTime = timeNow.setTime(timeNow.getTime() + 3600 * 1000);
      let expiringTime = new Date(timeNow.getTime() + 2 * 24 * 60 * 60 * 1000); //2 days after registration email is sent

      //TODO: send Email for verification
      let token = uuid4(); // we want a unique token of 16 characters

      await EmailVerificationToken.create({
        email,
        token,
        expires: expiringTime,
      });

      await sendAccountVerificationEmail(email, token);
    }
  } catch (error) {
    return { error: "Error Registering a User" };
  }
};

export const generatePasswordResetLink = async (formData) => {
  let errorData = { error: "" };
  let token = "";

  let ve = validateEmail(formData.get("email"));

  if (ve.length !== 0) errorData.error = ve;

  try {
    if (errorData.error.length !== 0) {
      return { error: errorData };
    }

    await connectMongoDB();

    let email = formData.get("email");
    const ifUserExists = await User.findOne({ email });

    if (ifUserExists) {
      const user = await PasswordReset.findOne({ email }).select("_id");

      if (user) {
        let timeNow = new Date();
        let expriringTime = timeNow.setTime(timeNow.getTime() + 3600 * 1000); //expire in 1 hr

        //TODO: send Email for verification
        token = uuid4(); // we want a unique token of 16 characters

        const filter = { email: email };
        const update = { token: token };
        const expires = { expires: expriringTime };
        let res = await PasswordReset.findOneAndUpdate(filter, update, expires);
      } else {
        let timeNow = new Date();
        let expriringTime = timeNow.setTime(timeNow.getTime() + 3600 * 1000); //expire in 1 hr
        token = uuid4(); // we want a unique token of 16 characters

        let res = await PasswordReset.create({
          email,
          token,
          expires: expriringTime,
        });
      }

      // console.log(`http://localhost:3000/reset-password?token=${token}`);

      await sendPasswordResetLinkEmail(email, token);

      return { success: "Check your email for password reset link!" };
    } else {
      return { error: "User not found!" };
    }
  } catch (error) {
    return { error: "Unexpected Error Occured!" };
  }
};

export const verifyUserEmailbyToken = async (token) => {
  //check if token is valid
  await connectMongoDB();

  const record = await EmailVerificationToken.findOne({ token });

  if (record) {
    const currentTime = new Date();
    if (record.expires > currentTime) {
      //finally set the emailVerified field in user table to current date.

      let ifUserExists = await User.findOne({ email: record.email });

      if (ifUserExists) {
        await User.findOneAndUpdate(
          { email: record.email },
          { emailVerified: true }
        );

        // Schedule token deletion after a delay
        setTimeout(async () => {
          await deleteExistingTokenByEmail(record.email); //delete token after being verified
        }, 1000 * 60 * 5); // Delete token after 5 minutes

        return { success: "Email Verified Successfully!" };
      } else {
        return { error: "User doesn't Exist!" };
      }
    } else {
      //token expired
      let newToken = uuid4();

      let verificationLink = `https://humble-computing-machine-97ww6wrxr6x37x7x.github.dev/new-email?token=${newToken}`;

      await EmailVerificationToken.findOneAndUpdate({
        email: record.email,
        token: newToken,
        expires: new Date() + 3600 * 1000,
      });

      await sendAccountVerificationEmail(record.email, newToken);
      return { success: "Verification Email has been sent Successfully" };
    }
  } else {
    return { error: "Invalid Token" };
  }
};

export async function getPageDataBySlug(slug) {
  await connectMongoDB();

  // Single aggregation with $lookup — replaces the prior .populate() pattern
  // which issued 2 sequential round-trips (Page findOne → Wheel findOne).
  // This halves DB latency for /wheels/[slug] at scale.
  const results = await Page.aggregate([
    { $match: { slug } },
    { $limit: 1 },
    {
      $lookup: {
        from: "wheels", // Mongoose pluralizes "Wheel" → "wheels"
        localField: "wheel",
        foreignField: "_id",
        as: "wheel",
      },
    },
    { $addFields: { wheel: { $arrayElemAt: ["$wheel", 0] } } },
    {
      $project: {
        title: 1,
        description: 1,
        content: 1,
        wheel: 1,
      },
    },
  ]);

  // Preserve legacy contract: caller checks `pageData === undefined` for 404 redirect.
  return results[0] || undefined;
}

/**
 * Direct DB fetch for a wheel by ObjectId.
 * Use this in SSR contexts instead of HTTP self-calling /api/wheel/[id] —
 * avoids the extra serverless invocation + JSON round-trip (~200-400ms saved).
 */
export async function getWheelById(wheelId) {
  if (!wheelId || !mongoose.Types.ObjectId.isValid(wheelId)) return null;
  await connectMongoDB();
  return Wheel.findOne({ _id: wheelId }).lean();
}

/**
 * Paginated wheels filtered by a single tag.
 * Used by `/tags/[tagId]` (SSR) and the "Load more" client action.
 *
 * Perf notes:
 *   - Lowercases the tag so the equality match can use the `tags: 1` index.
 *     Wheel.tags is normalised on write (see models/wheel.js setter).
 *   - `.lean()` returns plain JS objects — faster + smaller payload.
 *   - Caller should prefer cursor-based pagination for deep pages
 *     (see P1 audit); this keeps skip/limit for backward-compat.
 */
export async function getWheelsByTag(tag, { limit = 20, skip = 0 } = {}) {
  if (!tag || typeof tag !== "string") return [];
  await connectMongoDB();

  const normalized = tag.toLowerCase().trim();

  return Wheel.find({ tags: normalized })
    .select("title slug wheelPreview createdAt")
    .sort({ createdAt: -1 })
    .skip(Math.max(0, parseInt(skip, 10) || 0))
    .limit(Math.max(1, Math.min(100, parseInt(limit, 10) || 20)))
    .lean();
}

/**
 * Direct DB aggregation for tag-based related wheels.
 * Mirrors /api/related-wheels/advanced but called in-process for SSR use.
 */
export async function getRelatedWheelsByTags(tags, currentId = null) {
  if (!Array.isArray(tags) || tags.length === 0) return [];
  await connectMongoDB();

  const excludeId =
    currentId && mongoose.Types.ObjectId.isValid(currentId)
      ? new mongoose.Types.ObjectId(currentId)
      : null;

  const pipeline = [
    {
      $match: {
        tags: { $in: tags },
        ...(excludeId ? { _id: { $ne: excludeId } } : {}),
      },
    },
    {
      $addFields: {
        overlapCount: {
          $size: {
            $filter: {
              input: "$tags",
              as: "tag",
              cond: { $in: ["$$tag", tags] },
            },
          },
        },
      },
    },
    { $match: { overlapCount: { $gte: 1 } } },
    { $sort: { overlapCount: -1, createdAt: -1 } },
    { $limit: 20 },
    {
      $project: {
        _id: 1,
        title: 1,
        wheelPreview: 1,
        tags: 1,
        overlapCount: 1,
      },
    },
  ];

  const candidates = await Wheel.aggregate(pipeline);

  // Diversity injection — same logic as /api/related-wheels/advanced
  const topOverlap = candidates.slice(0, 7);
  const shuffled = candidates.slice(7).sort(() => 0.5 - Math.random());
  return [...topOverlap, ...shuffled.slice(0, 3)];
}

export async function getAllWheelPages() {
  await connectMongoDB();

  const Slugs = await Page.aggregate([
    {
      $project: {
        _id: 0,
        slug: 1,
      },
    },
  ]);

  return Slugs.map((doc) => doc.slug);
}

export async function storeWheelDataToDatabase(initialJSONData) {
  try {
    const { jsonKey, jsonData } = initialJSONData; // Extract the JSON data from the request body

    // console.log("JsonKey = ", jsonKey);
    // console.log("jsonData = ", jsonData);

    // Validate the JSON data to ensure it has the necessary fields
    if (
      !jsonData ||
      !jsonData.title ||
      !jsonData.description ||
      !jsonData.segments
    ) {
      return { message: "Invalid JSON format. Missing required fields." };
    }

    await connectMongoDB();

    // Step 1: Create the Wheel
    const wheelData = jsonData; // Directly use the JSON data received

    const dataObjectForSegments = ensureArrayOfObjects(wheelData.segments);

    const wheelExists = await Wheel.findOne({ title: wheelData.title });
    let wheel = null;

    if (wheelExists) {
      wheel = await Wheel.findOneAndUpdate({
        title: wheelData.title,
        description: wheelData.description,
        category: wheelData.category || "",
      });
    } else {
      wheel = new Wheel({
        title: wheelData.title,
        description: wheelData.description,
        data: dataObjectForSegments || [], // Handle content if present
        createdBy: "gauravsingh9314@gmail.com", // Assuming admin for simplicity
        category: wheelData.category || "",
      });
      // Save the wheel to the database
      await wheel.save();
    }

    // console.log("Wheel Saved");

    const pageSlug = replaceUnderscoreWithDash(jsonKey);
    // Step 2: Create the Page
    const pageData = {
      title: `${wheelData.title}`,
      description: `${wheelData.description}`,
      content: wheelData.content || [],
      slug: pageSlug.toLowerCase(),
      indexed: true,
      wheel: wheel._id, // Reference to the created wheel
    };

    const page = new Page(pageData);
    await page.save();

    // console.log("Paged Saved");
    return {
      success: "Page and Wheel Created Successfully",
    };
  } catch (error) {
    // console.log("Error ", error);
    return { error: "Error Creating Page and Wheel" };
  }
}

/**
 * Get reaction + follow stats for any entity.
 *
 * @param {Object} params
 * @param {string} params.entityType - e.g. "post", "review", "question", "topicpage", "wheel"
 * @param {string} params.entityId   - ObjectId string
 */

export async function getContentStats({ entityType, entityId, show, userEmail, userId: passedUserId }) {
  await connectMongoDB();

  const id = mongoose.Types.ObjectId.isValid(entityId)
    ? new mongoose.Types.ObjectId(entityId)
    : entityId;

  // Resolve userId — prefer passed ID (from session.user.id), fall back to email lookup
  let userId = null;
  try {
    if (passedUserId && mongoose.Types.ObjectId.isValid(passedUserId)) {
      userId = new mongoose.Types.ObjectId(passedUserId);
    } else if (userEmail) {
      const user = await User.findOne({ email: userEmail })
        .select("_id")
        .lean();
      if (user) userId = user._id;
    } else {
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        userId = new mongoose.Types.ObjectId(session.user.id);
      } else if (session?.user?.email) {
        const user = await User.findOne({ email: session.user.email })
          .select("_id")
          .lean();
        if (user) userId = user._id;
      }
    }
  } catch (err) {
    console.error("User lookup failed:", err);
  }

  // Build all queries in parallel instead of sequential
  const queries = [];
  const queryKeys = [];

  if (show?.like) {
    // Use countDocuments instead of aggregate — much cheaper with compound index
    queries.push(
      Reaction.countDocuments({ entityType, entityId: id, reactionType: "like" })
    );
    queryKeys.push("likeCount");

    if (userId) {
      queries.push(
        Reaction.findOne({ entityType, entityId: id, userId })
          .select("reactionType")
          .lean()
      );
      queryKeys.push("userReact");
    }
  }

  if (show?.follow) {
    queries.push(
      Follow.countDocuments({ entityType, entityId: id })
    );
    queryKeys.push("followCount");

    if (userId) {
      queries.push(
        Follow.findOne({ entityType, entityId: id, userId }).lean()
      );
      queryKeys.push("userFollow");
    }
  }

  const results = await Promise.all(queries);

  // Map results back by key
  const resultMap = {};
  queryKeys.forEach((key, i) => { resultMap[key] = results[i]; });

  const result = {};

  if (show?.like) {
    result.reactions = { like: resultMap.likeCount || 0 };
    result.reactedByUser = {
      like: !!resultMap.userReact,
    };
  }

  if (show?.follow) {
    result.followCount = resultMap.followCount || 0;
    result.isFollowing = !!resultMap.userFollow;
  }

  return result;
}

/**
 * Batched wheel-page hydration data.
 * Replaces 3 separate client calls (/api/wheel-analytics/:id,
 * /api/comments/count, getContentStats) with a single parallel DB round-trip.
 *
 * Called from SSR (page.js) to pass as `initialMeta` prop so the client
 * renders with real numbers immediately — no 0→N flicker, no client fetch.
 *
 * Also powers /api/wheel/:id/meta for any client-side refresh scenarios.
 *
 * @param {string} wheelId - The wheel's ObjectId.
 * @param {string|null} userId - Optional current user id for `reactedByUser`.
 */
export async function getWheelMeta(wheelId, userId = null) {
  if (!wheelId || !mongoose.Types.ObjectId.isValid(wheelId)) {
    return null;
  }
  await connectMongoDB();

  const wheelObjectId = new mongoose.Types.ObjectId(wheelId);
  const userObjectId =
    userId && mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : null;

  // Run all 4 independent reads in parallel.
  const [analytics, commentCount, likeCount, userReact] = await Promise.all([
    WheelAnalytics.findOne({ wheel: wheelObjectId })
      .select("view_count spin_count")
      .lean(),
    Comment.countDocuments({
      entityType: "wheel",
      entityId: wheelObjectId,
      parentCommentId: null,
    }),
    Reaction.countDocuments({
      entityType: "wheel",
      entityId: wheelObjectId,
      reactionType: "like",
    }),
    userObjectId
      ? Reaction.findOne({
          entityType: "wheel",
          entityId: wheelObjectId,
          userId: userObjectId,
        })
          .select("reactionType")
          .lean()
      : Promise.resolve(null),
  ]);

  return {
    analytics: {
      view_count: analytics?.view_count || 0,
      spin_count: analytics?.spin_count || 0,
    },
    commentCount: commentCount || 0,
    reactions: { like: likeCount || 0 },
    reactedByUser: { like: !!userReact },
  };
}

/**
 * Calls the OpenAI Chat Completions API with a given prompt and logs usage metadata.
 *
 * This function serves two purposes:
 * 1. Executes a request to the OpenAI API using the specified model and options.
 * 2. Logs metadata about the request/response (user ID, prompt, token usage, etc.)
 *    into the `ApiLog` collection for later analysis and cost tracking.
 *
 * The logging is done in a "fire-and-forget" style, meaning the API response
 * is returned immediately to the caller without waiting for the database write.
 * This improves responsiveness under concurrent load.
 *
 * @async
 * @function callOpenAI
 * @param {string} userId - Unique identifier of the user making the request.
 * @param {string} prompt - The text prompt to send to the OpenAI model.
 * @param {object} options - Additional options for the OpenAI API call
 *                           (e.g., max_tokens, temperature).
 *
 * @returns {Promise<object>} The raw response object returned by OpenAI.
 *
 * @example
 * const response = await callOpenAI("user123", "Give me 5 color codes", { max_tokens: 200 });
 * console.log(response.choices[0].message.content);
 *
 * @remarks
 * - The function uses the `gpt-4o-mini` model by default.
 * - Metadata stored in MongoDB includes:
 *   - `userId`: to attribute usage to a specific user.
 *   - `prompt`: the text sent to the API (consider sanitizing if sensitive).
 *   - `model`: which OpenAI model was used.
 *   - `promptTokens` and `completionTokens`: token usage metrics from OpenAI.
 *   - `responseId`: unique identifier for the API response (useful for debugging).
 * - Errors during logging are caught and printed, but do not affect the API response.
 */
export async function callOpenAI(userId, prompt, options, promptToStoreInDB) {
  // Call OpenAI
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    ...options,
  });

  //only store in ApiLog DB if user is not Admin
  if (userId !== "66dc4f8b2e40c86cdae0ea48") {
    // Fire-and-forget logging (non-blocking)
    ApiLog.create({
      userId,
      prompt: promptToStoreInDB,
      model: response.model,
      promptTokens: response.usage.prompt_tokens,
      completionTokens: response.usage.completion_tokens,
      responseId: response.id,
    }).catch((err) => console.error("Failed to log API usage:", err));
  }
  
  return response;
}
