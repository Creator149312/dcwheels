import { NextResponse } from "next/server";
import mongoose from "mongoose";

/**
 * Validates whether a value is a valid 24-character hexadecimal MongoDB ObjectId.
 * @param {any} id
 * @returns {boolean}
 */
export function isValidObjectId(id) {
  if (!id || typeof id !== "string") return false;
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

/**
 * Guard helper that returns a standardized 400 Bad Request response if id is invalid.
 * @param {any} id
 * @param {string} [name="id"]
 * @returns {NextResponse|null} Null if valid, or a 400 NextResponse if invalid.
 */
export function validateObjectIdParam(id, name = "ID") {
  if (!isValidObjectId(id)) {
    return NextResponse.json(
      { error: `Invalid ${name} format` },
      { status: 400 }
    );
  }
  return null;
}

/**
 * Sanitizes and logs backend errors server-side while returning a safe,
 * uniform error response to the client (avoids leaking stack traces,
 * database schema details, or internals).
 *
 * @param {Error|any} err
 * @param {string} [fallbackMessage="An unexpected error occurred"]
 * @param {number} [status=500]
 * @returns {NextResponse}
 */
export function apiError(err, fallbackMessage = "An unexpected error occurred", status = 500) {
  // Always log the full technical details on the server for debugging
  console.error(`[API Error] ${fallbackMessage}:`, err);

  const isDev = process.env.NODE_ENV === "development";

  // In production, keep client response completely generic and safe
  const body = {
    error: fallbackMessage,
  };

  if (isDev && err?.message) {
    body.debug = err.message;
  }

  return NextResponse.json(body, { status });
}
