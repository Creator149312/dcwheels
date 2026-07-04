/**
 * Normalizes item IDs and types for consistent React key usage
 */
export function getFeedItemKey(item, index) {
  if (item.id === "home" || item._id === "home") return home-feed- + index;
  return item.id || item._id || item- + index;
}

/**
 * Distributes feed items to ensure a mix of wheels and posts.
 * Primarily used to interleave wheels into a post-heavy feed.
 */
export function distributeFeedItems(items = []) {
  if (!items || items.length === 0) return [];
  
  const wheels = items.filter(i => (i.docType === 'wheel' || i._docType === 'wheel'));
  const posts = items.filter(i => (i.docType === 'post' || i._docType === 'post' || (!i.docType && !i._docType)));
  
  // If we only have one type, just return them
  if (wheels.length === 0) return posts;
  if (posts.length === 0) return wheels;
  
  const result = [];
  const postLimit = 5; // Interleave 1 wheel every 5 posts
  
  let wheelIdx = 0;
  let postCount = 0;
  
  posts.forEach((post) => {
    result.push(post);
    postCount++;
    
    if (postCount >= postLimit && wheelIdx < wheels.length) {
      result.push(wheels[wheelIdx]);
      wheelIdx++;
      postCount = 0;
    }
  });
  
  // Append remaining wheels
  while (wheelIdx < wheels.length) {
    result.push(wheels[wheelIdx]);
    wheelIdx++;
  }
  
  return result;
}

/**
 * Injects ad markers into a feed at regular intervals.
 * Components can then render an AdUnit when they see isAdMarker: true.
 */
export function injectAdMarkers(items = [], adInterval = 6) {
  if (!items || items.length === 0) return items;
  
  const result = [];
  items.forEach((item, index) => {
    result.push(item);
    // Add ad marker AFTER the interval (e.g., after 6th item)
    if ((index + 1) % adInterval === 0 && index !== items.length - 1) {
      result.push({ 
        isAdMarker: true, 
        docType: "ad", // Consistency
        id: "ad-" + index + "-" + (item._id || item.id)
      });
    }
  });
  
  return result;
}
