/**
 * Industrial-standard feed interleaver.
 *
 * Major platforms (Instagram/YouTube/Facebook) use a "Rule-based Slotting" system.
 * This separates the DATA (Fetched from DB) from the PLACEMENT (UX rules).
 *
 * Rules implemented:
 * 1. Primary content (Posts) forms the base.
 * 2. Secondary content (Wheels) is slotted every N items.
 * 3. Discovery/Collections (Lists) are slotted at fixed indices (e.g. index 2) to maximize visibility.
 * 4. Monetization (Ads) are injected last using absolute positions to avoid layout shifts.
 */
export function buildStandardFeed(items = [], options = {}) {
  const {
    wheelCadence = 4, // 1 wheel every 4 posts
    listIndices = [2], // Show List Shelf specifically at the 3rd position (Index 2)
    adInterval = 7,    // Ads every 7 items
  } = options;

  if (!items || items.length === 0) return [];

  // 1. Separate items by Category
  const posts = [];
  const wheels = [];
  const lists = [];
  const others = [];

  items.forEach(item => {
    const type = item.docType || item._docType || "post";
    if (type === "post") posts.push(item);
    else if (type === "wheel") wheels.push(item);
    else if (type === "list") {
      // Universal Rule: lists must have at least 5 items AND be of type 'entity'
      // Word lists are utility/internal; Entity lists are discovery-worthy.
      const hasMinItems = item.items && item.items.length >= 5;
      const isEntityList = item.items && item.items.some(i => i.type === "entity");
      
      if (hasMinItems && isEntityList) {
        lists.push(item);
      }
    }
    else others.push(item);
  });

  const finalFeed = [];
  let wheelIdx = 0;
  let listIdx = 0;

  // 2. Interleave following Platform Standards
  posts.forEach((post, i) => {
    // Check if current slot is a reserved List index
    // Industry tip: Lists are "Discovery Layer" and should be at the top.
    if (listIndices.includes(finalFeed.length) && listIdx < lists.length) {
      finalFeed.push(lists[listIdx++]);
    }

    // Add the Post
    finalFeed.push(post);

    // After every N posts, inject a Wheel
    // Industry tip: Wheels/Shorts increase "Dwell Time".
    if ((i + 1) % wheelCadence === 0 && wheelIdx < wheels.length) {
      finalFeed.push(wheels[wheelIdx++]);
    }
  });

  // 3. Append remaining discovery items that weren't slotted
  while (listIdx < lists.length || wheelIdx < wheels.length) {
    if (listIdx < lists.length) finalFeed.push(lists[listIdx++]);
    if (wheelIdx < wheels.length) finalFeed.push(wheels[wheelIdx++]);
  }

  // 4. Inject Ads based on final positions
  // Industry tip: Ads should be injected into the final array so they don't move
  // if content is prepended/appended later.
  const adInjectedFeed = [];
  finalFeed.forEach((item, index) => {
    adInjectedFeed.push(item);
    if ((index + 1) % adInterval === 0 && index !== finalFeed.length - 1) {
      adInjectedFeed.push({
        isAdMarker: true,
        docType: "ad",
        id: `ad-${index}-${item.id || item._id}`
      });
    }
  });

  return adInjectedFeed;
}

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
  const lists = items.filter(i => {
    const isList = (i.docType === 'list' || i._docType === 'list');
    if (!isList) return false;
    // Universal Rule: lists must have at least 5 items AND be of type 'entity'
    const hasMinItems = i.items && i.items.length >= 5;
    const isEntityList = i.items && i.items.some(item => item.type === "entity");
    return hasMinItems && isEntityList;
  });
  const posts = items.filter(i => (i.docType === 'post' || i._docType === 'post' || (!i.docType && !i._docType && i.docType !== 'list' && i._docType !== 'list')));
  
  // If we only have one type and it's posts, just return them
  if (wheels.length === 0 && lists.length === 0) return posts;
  
  const result = [];
  const mixedOther = [...wheels, ...lists];
  // Sort by createdAt descending if dates exist
  mixedOther.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt) : 0;
    const dateB = b.createdAt ? new Date(b.createdAt) : 0;
    return dateB - dateA;
  });
  
  const postLimit = 5; // Interleave 1 other item every 5 posts
  
  let otherIdx = 0;
  let postCount = 0;
  
  posts.forEach((post) => {
    result.push(post);
    postCount++;
    
    if (postCount >= postLimit && otherIdx < mixedOther.length) {
      result.push(mixedOther[otherIdx]);
      otherIdx++;
      postCount = 0;
    }
  });
  
  // Append remaining items
  while (otherIdx < mixedOther.length) {
    result.push(mixedOther[otherIdx]);
    otherIdx++;
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
