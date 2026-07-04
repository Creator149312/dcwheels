# Actionable Code Changes: userId Implementation

## File-by-File Implementation Guide

### 1. lib/dashboard.js

#### Change 1A: `buildDashboardData()` — Match statement (Line ~83)
```javascript
// BEFORE:
{ $match: { createdBy: email } },

// AFTER:
{ $match: { userId: new mongoose.Types.ObjectId(userId) } },
```

#### Change 1B: `buildDashboardData()` — Count statement (Line ~120)
```javascript
// BEFORE:
Wheel.countDocuments({ createdBy: email }),

// AFTER:
Wheel.countDocuments({ userId: new mongoose.Types.ObjectId(userId) }),
```

#### Change 1C: `getDashboardWheels()` — Match statement (Line ~185)
```javascript
// BEFORE:
export async function getDashboardWheels(email) {
  return unstable_cache(
    async () => {
      await connectMongoDB();
      const wheels = await Wheel.aggregate([
        { $match: { createdBy: email } },

// AFTER:
export async function getDashboardWheels(userId) {
  return unstable_cache(
    async () => {
      await connectMongoDB();
      const wheels = await Wheel.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
```

#### Change 1D: `getProfileWheels()` — Query building (Line ~213-220)
```javascript
// BEFORE:
export async function getProfileWheels(email, onlyPublic = false) {
  await connectMongoDB();
  const query = { createdBy: email };
  if (onlyPublic) {
    query.isPublic = true;
  }
  const wheels = await Wheel.aggregate([
    { $match: query },

// AFTER:
export async function getProfileWheels(userId, onlyPublic = false) {
  await connectMongoDB();
  const query = { userId: new mongoose.Types.ObjectId(userId) };
  if (onlyPublic) {
    query.isPublic = true;
  }
  const wheels = await Wheel.aggregate([
    { $match: query },
```

#### Change 1E: `buildDashboardData()` function signature (Line ~65)
```javascript
// BEFORE:
async function buildDashboardData({ userId, email }) {

// AFTER:
async function buildDashboardData({ userId, email }) {
// Keep userId parameter; update only the queries to use it instead of email for Wheel queries
```

---

### 2. app/u/[username]/page.js

#### Change 2A: Update getProfileWheels call (Line ~105)
```javascript
// BEFORE:
getProfileWheels(user.email, !isOwner),

// AFTER:
getProfileWheels(String(user._id), !isOwner),
```

---

### 3. Where Wheels Are Created

**Search for these patterns and update:**

```javascript
// PATTERN 1: Direct Wheel creation
const newWheel = new Wheel({
  title: req.body.title,
  description: req.body.description,
  data: req.body.data,
  createdBy: user.email,
  // ADD THIS LINE:
  userId: new mongoose.Types.ObjectId(user._id),
  authorHandle: user.username,
  // ... other fields
});

// PATTERN 2: Wheel.create
Wheel.create({
  title,
  description,
  data,
  createdBy: user.email,
  // ADD THIS LINE:
  userId: new mongoose.Types.ObjectId(user._id),
  authorHandle: user.username,
  // ... other fields
});

// PATTERN 3: wheel.save() after building object
const wheel = new Wheel({...});
wheel.userId = new mongoose.Types.ObjectId(user._id);  // ADD THIS
wheel.save();
```

**Common file locations** (search your codebase):
- `app/api/wheel/create` (most likely)
- `app/api/wheel/` (any route)
- `app/api/wheels/` (any route)
- `lib/wheelService.js` (if exists)
- Dashboard creation handlers

---

### 4. lib/feedService.js (Optional)

#### Change 4A: If filtering by creator (Line ~75-95)
```javascript
// BEFORE (if present):
const wheelMatch = {
  createdBy: someName,
  isPublic: true
};

// AFTER:
const wheelMatch = {
  userId: new mongoose.Types.ObjectId(someUserId),
  isPublic: true
};

// ALSO ADD TO PROJECTION:
$project: {
  _docType: { $literal: "wheel" },
  _id: 1,
  title: 1,
  content: "$description",
  authorName: "$createdBy",
  authorHandle: 1,
  userId: 1,  // ADD THIS if it exists and you need it
  authorImage: "$authorProfileImage",
  createdAt: 1,
  wheelPreview: 1,
  tags: 1,
  likeCount: 1,
}
```

---

### 5. lib/topicPage.js (Optional)

#### Change 5A: If filtering by creator in `fetchTaggedWheels()` (Line ~156+)
```javascript
// BEFORE (if present):
const direct = await Wheel.find({
  relatedTopics: { $elemMatch: { type, id: String(relatedId) } },
  createdBy: someCreator  // IF THIS EXISTS
})

// AFTER:
const direct = await Wheel.find({
  relatedTopics: { $elemMatch: { type, id: String(relatedId) } },
  userId: new mongoose.Types.ObjectId(creatorUserId)  // UPDATE THIS
})
```

---

### 6. API Routes (app/api/wheel/* and app/api/wheels/*)

**Search pattern**: `Wheel.find({ createdBy`

**For each occurrence**:
```javascript
// BEFORE:
const wheels = await Wheel.find({ createdBy: user.email });
const count = await Wheel.countDocuments({ createdBy: user.email });

// AFTER:
const wheels = await Wheel.find({ userId: new mongoose.Types.ObjectId(user._id) });
const count = await Wheel.countDocuments({ userId: new mongoose.Types.ObjectId(user._id) });
```

---

### 7. Dashboard Calls to Updated Functions

**If you updated `getDashboardWheels(email)` to `getDashboardWheels(userId)`:**

Search for all calls to `getDashboardWheels()`:
```javascript
// BEFORE:
const wheels = await getDashboardWheels(user.email);

// AFTER:
const wheels = await getDashboardWheels(String(user._id));
```

---

### 8. buildDashboardData Calls

**If you have callers to `buildDashboardData()`**, check if they pass both `userId` and `email`:

```javascript
// This should already work (userId is likely already passed):
const data = await buildDashboardData({ userId: String(user._id), email: user.email });
```

If `buildDashboardData()` is called elsewhere without userId, update the caller:
```javascript
// BEFORE:
await buildDashboardData({ userId, email: user.email });

// AFTER (if userId not provided):
await buildDashboardData({ userId: String(user._id), email: user.email });
```

---

## Summary of Changes by Impact

### Must Change (1 file, 5 edits):
- `lib/dashboard.js` — 5 changes in 4 functions

### Should Change (1 file, 1 edit):
- `app/u/[username]/page.js` — 1 change in function call

### Must Add (Multiple files):
- All Wheel creation → Add `userId` field
- Search: `new Wheel({` or `Wheel.create({`

### Optional (3 files):
- `lib/feedService.js` — If filtering by creator
- `lib/topicPage.js` — If filtering by creator
- `app/api/wheel/*` — API route optimization

---

## Testing Checklist

After each change:

- [ ] Code compiles: `npm run dev`
- [ ] No errors in terminal
- [ ] Profile page works: `/u/[username]`
- [ ] Dashboard loads: `/dashboard`
- [ ] New wheel created → userId populated

---

## Search Commands (Terminal)

Find all occurrences to update:

```bash
# Find all { createdBy: 
grep -r "{ createdBy:" src/ app/ lib/ --include="*.js" --include="*.jsx"

# Find all createdBy: email
grep -r "createdBy: email" src/ app/ lib/ --include="*.js" --include="*.jsx"

# Find all new Wheel({
grep -r "new Wheel(" src/ app/ lib/ --include="*.js" --include="*.jsx"

# Find all Wheel.create(
grep -r "Wheel.create(" src/ app/ lib/ --include="*.js" --include="*.jsx"
```

---

## Important Notes

✅ **Always include**: `new mongoose.Types.ObjectId(userId)`  
✅ **Never delete**: `createdBy` field  
✅ **Keep both**: createdBy (string) + userId (ObjectId)  
✅ **Test each file**: After updating  
✅ **Run backfill first**: Before updating code  

---

## If You Get Stuck

1. **Can't find where wheels are created?**  
   → Search: `"new Wheel("` or `"Wheel.create("`

2. **getUserId from email?**  
   → Use: `user._id` (already have User object from auth)

3. **Which parameter is userId vs email?**  
   → userId = `String(user._id)` or `new ObjectId(user._id)`  
   → email = `user.email` (string)

4. **TypeError: userId is not ObjectId?**  
   → Wrap: `new mongoose.Types.ObjectId(userId)`

5. **Query returns no results after update?**  
   → Run backfill script: `node scripts/backfill-userId-to-wheels.mjs`  
   → Check existing wheels have userId populated

---

Done? Verify with: `npm run dev` → no errors ✅
