/**
 * Industrial-standard feed interleaver.
 *
 * Major platforms (Instagram/YouTube/Facebook) use a "Rule-based Slotting" system.
 * This separates the DATA (Fetched from DB) from the PLACEMENT (UX rules).
 *
 * Target blend: ~60% posts / ~25% wheels / ~15% lists.
 * When posts are sparse, remaining wheels/lists fill the tail (each once).
 */
export function buildStandardFeed(items = [], options = {}) {
  const {
    wheelCadence = 4,   // 1 wheel every 4 slots (~25%)
    listPosition = 2,   // Batch-relative slot for the server-injected list
    topicPosition = 5,  // Batch-relative slot for the server-injected TopicPage card (after ~5 posts)
    adInterval = 7,     // Ads every 7 items
    slotOffset = 0,     // Continue cadence from a previous batch (infinite scroll)
  } = options;

  if (!items || items.length === 0) return [];

  // 1. Separate by category; each id enters exactly one queue exactly once.
  const posts = [];
  const wheels = [];
  const lists = [];
  const topics = [];
  const seen = new Set();

  items.forEach(item => {
    const id = String(item._id || item.id || "");
    if (!id || seen.has(id)) return;
    seen.add(id);
    const type = item.docType || item._docType || "post";
    if (type === "post") posts.push(item);
    else if (type === "wheel") wheels.push(item);
    else if (type === "topic") topics.push(item);
    else if (type === "list") {
      // Only entity lists with 5+ items are discovery-worthy.
      const hasMinItems = item.items && item.items.length >= 5;
      const isEntityList = item.items && item.items.some(i => i.type === "entity");
      if (hasMinItems && isEntityList) lists.push(item);
    }
  });

  // 2. Interleave: one placement per iteration, queues only move forward,
  // so an item can never be emitted twice.
  const finalFeed = [];
  const total = posts.length + wheels.length + lists.length + topics.length;
  let p = 0, w = 0, l = 0, t = 0;
  while (finalFeed.length < total) {
    const slot = slotOffset + finalFeed.length + 1;
    if (l < lists.length && finalFeed.length === listPosition) finalFeed.push(lists[l++]);
    else if (t < topics.length && finalFeed.length === topicPosition) finalFeed.push(topics[t++]);
    else if (w < wheels.length && (slot % wheelCadence === 0 || p >= posts.length)) finalFeed.push(wheels[w++]);
    else if (p < posts.length) finalFeed.push(posts[p++]);
    else if (t < topics.length) finalFeed.push(topics[t++]);
    else if (l < lists.length) finalFeed.push(lists[l++]);
    else finalFeed.push(wheels[w++]);
  }

  // 3. Ads on absolute positions so cadence continues across batches.
  const adInjectedFeed = [];
  finalFeed.forEach((item, index) => {
    adInjectedFeed.push(item);
    if ((slotOffset + index + 1) % adInterval === 0 && index !== finalFeed.length - 1) {
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
 * Reorder a batch of feed items for the warm state: boost items whose tags
 * match the user's tracked affinities, while reserving a permanent discovery
 * floor so the feed never becomes a single-fandom echo chamber.
 *
 * @param {Array} items - raw feed items (before slotting)
 * @param {Object|null} affinityShares - { anime: 0.6, game: 0.3, ... } from getAffinityShares()
 * @param {number} discoveryFloor - fraction of items that must be non-affinity (default 15%)
 */
export function applyWarmOrder(items = [], affinityShares = null, discoveryFloor = 0.15) {
  if (!affinityShares || items.length === 0) return items;

  const scored = items.map((item) => {
    const tags = item.tags || [];
    const contentType = item.contentRef?.type || null;
    let score = 0;

    for (const [cat, share] of Object.entries(affinityShares)) {
      if (contentType === cat || tags.includes(cat)) score += share;
    }
    return { item, score };
  });

  // Affinity-matched items first, then the rest — but keep relative order
  // stable within each group so recency pacing is preserved.
  const matched = scored.filter((s) => s.score > 0).map((s) => s.item);
  const unmatched = scored.filter((s) => s.score === 0).map((s) => s.item);

  // Discovery floor: interleave at least `floor` share of unmatched items
  // throughout, so a 90%-anime user still sees movies/games regularly.
  const floorCount = Math.max(1, Math.round(items.length * discoveryFloor));
  const discovery = unmatched.slice(0, floorCount);
  const rest = [...matched, ...unmatched.slice(floorCount)];

  // Sprinkle discovery items evenly across the warm feed
  const result = [...rest];
  discovery.forEach((d, idx) => {
    const pos = Math.min(result.length, Math.floor(((idx + 1) * result.length) / (floorCount + 1)));
    result.splice(pos, 0, d);
  });

  return result;
}

/**
 * Normalizes item IDs and types for consistent React key usage
 */
export function getFeedItemKey(item, index) {
  if (item.id === "home" || item._id === "home") return `home-feed-${index}`;
  return String(item.id || item._id || `item-${index}`);
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
