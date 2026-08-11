import { del } from "@vercel/blob";

/**
 * Utility to safely clean up Vercel Blob assets.
 * Handles both single URL strings and arrays of URLs.
 * 
 * @param {string|string[]} urls - The URL or array of URLs to delete from Vercel Blob.
 * @returns {Promise<void>}
 */
export async function cleanupBlobAssets(urls) {
  if (!urls) return;

  // Normalize to array
  const urlArray = Array.isArray(urls) ? urls : [urls];
  
  // Filter for valid Vercel Blob URLs only
  const blobUrls = urlArray.filter(url => 
    typeof url === "string" && 
    url.includes(".blob.vercel-storage.com")
  );

  if (blobUrls.length === 0) return;

  try {
    // del() accepts an array of strings
    await del(blobUrls);
  } catch (error) {
    // Non-critical: don't throw so the main operation (like DB delete)
    // isn't rolled back because of an asset cleanup failure.
  }
}
