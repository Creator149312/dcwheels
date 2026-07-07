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
    console.log(`Successfully cleaned up ${blobUrls.length} blob assets.`);
  } catch (error) {
    console.error("Failed to cleanup blob assets:", error);
    // We don't throw here to ensure the main operation (like DB delete) 
    // isn't rolled back because of a non-critical asset cleanup failure.
  }
}
