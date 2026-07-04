# userId Migration Guide for Wheels Collection

## Overview
Adding `userId` (ObjectId reference) to the Wheels schema for faster querying and filtering by creator. Keeps `createdBy` (email) for backward compatibility and display purposes.

## What Changed
✅ **Schema**: Added `userId` field to Wheel model  
✅ **Indexes**: Added `{ userId: 1, createdAt: -1 }` and `{ userId: 1, isPublic: 1, likeCount: -1 }`  
✅ **Script**: Created backfill script to populate existing wheels

## Phase 1: Run Backfill Script (Required)
```bash
node scripts/backfill-userId-to-wheels.mjs
```

This will:
- Find all wheels without userId
- Look up User by email, username, or name
- Update wheel documents with the User._id
- Report success/failure counts

## Phase 2: Update Code to Use userId (Optional but Recommended)

### Priority 1: Dashboard & Profile Queries
These are called frequently and benefit most from userId index:

#### 1. **lib/dashboard.js** — getProfileWheels()
**File**: `d:\Projects\SpinWheel\lib\dashboard.js` (Line 213-235)

**Current**:
```javascript
const query = { createdBy: email };
```

**Change to**:
```javascript
// After: const userId = user._id (you'll need to pass this)
const query = { userId: new mongoose.Types.ObjectId(userId) };
```

**Note**: Requires `userId` to be available in the function. Update the function signature to accept `userId` instead of `email`, or perform a User lookup first.

---

#### 2. **lib/dashboard.js** — buildDashboardData()
**File**: `d:\Projects\SpinWheel\lib\dashboard.js` (Line 80-125)

**Current**:
```javascript
Wheel.aggregate([
  { $match: { createdBy: email } },
  // ...
])

Wheel.countDocuments({ createdBy: email })
```

**Change to**:
```javascript
Wheel.aggregate([
  { $match: { userId: new mongoose.Types.ObjectId(userId) } },
  // ...
])

Wheel.countDocuments({ userId: new mongoose.Types.ObjectId(userId) })
```

---

#### 3. **lib/dashboard.js** — getDashboardWheels()
**File**: `d:\Projects\SpinWheel\lib\dashboard.js` (Line 175-200)

**Current**:
```javascript
const wheels = await Wheel.aggregate([
  { $match: { createdBy: email } },
  // ...
])
```

**Change to**:
```javascript
const wheels = await Wheel.aggregate([
  { $match: { userId: new mongoose.Types.ObjectId(userId) } },
  // ...
])
```

---

### Priority 2: User Profile & Creation Queries

#### 4. **app/u/[username]/page.js**
**File**: `d:\Projects\SpinWheel\app\u\[username]\page.js` (Line 105)

**Current**:
```javascript
getProfileWheels(user.email, !isOwner)
```

**Change to**:
```javascript
getProfileWheels(String(user._id), !isOwner)  // Pass userId instead of email
```

Then update `getProfileWheels` to accept userId and query by it.

---

#### 5. **lib/dashboard.js** — createNewWheel() / wheel creation
**File**: Various API routes that create wheels

**When creating a wheel, ensure**:
```javascript
const newWheel = new Wheel({
  title,
  description,
  data,
  createdBy: user.email,      // Keep for display/legacy
  userId: new mongoose.Types.ObjectId(user._id),  // Add this
  authorHandle: user.username,
  authorName: user.name,
  // ... other fields
});
```

**Search for**:
- `app/api/wheel/create` or similar create endpoints
- Dashboard wheel creation functions
- Any POST handlers that create Wheel documents

---

### Priority 3: Aggregation & Feed Queries

#### 6. **lib/feedService.js**
**File**: `d:\Projects\SpinWheel\lib\feedService.js` (Line 75-95)

**Current** (if filtering by creator):
```javascript
{ $match: wheelMatch }  // May include createdBy
```

**Change to** (if needed):
```javascript
{ $match: wheelMatch }  // Use userId if filtering by creator
```

**Add to projection** (if not present):
```javascript
userId: 1,  // Now available for further filtering
```

---

#### 7. **lib/topicPage.js** — fetchTaggedWheels()
**File**: `d:\Projects\SpinWheel\lib\topicPage.js` (Line 156+)

**If this filters by creator**, change `createdBy` to `userId`.

---

### Priority 4: API Routes (Optional Enhancement)
Search for files matching pattern:
- `app/api/wheel/*`
- `app/api/user/wheels/*`

**Typical changes**:
```javascript
// From:
const wheels = await Wheel.find({ createdBy: req.user.email });

// To:
const wheels = await Wheel.find({ userId: req.user._id });
```

---

## Testing Checklist

After updating code:

- [ ] Profile page loads wheels for creator
- [ ] Dashboard "My Wheels" displays correctly
- [ ] Creating a new wheel sets userId correctly
- [ ] Filtering public/private wheels works
- [ ] Performance improved (check query time in MongoDB logs)

---

## Performance Gains

**Before** (createdBy string query):
```
Wheel.find({ createdBy: "user@example.com" }).sort({ createdAt: -1 })
  → Collection scan or index scan on { createdBy, createdAt }
  → ~50-100ms for 1000 wheels per user
```

**After** (userId ObjectId query):
```
Wheel.find({ userId: ObjectId(...) }).sort({ createdAt: -1 })
  → Fast index seek on { userId, createdAt }
  → ~5-20ms for 1000 wheels per user
```

---

## Backward Compatibility

**DO NOT delete `createdBy`** — it's used for:
- Legacy admin queries
- Display purposes (if needed)
- Audit trails
- Potential fallback lookups

Keep both fields indefinitely unless you perform a full audit.

---

## Rollback Plan

If userId queries fail:
1. Revert code changes to use `createdBy`
2. Keep schema as-is (having extra userId field doesn't hurt)
3. Rerun backfill script once issues are resolved

---

## Files Summary

| File | Change Type | Priority | Impact |
|------|------------|----------|---------|
| models/wheel.js | Schema + Indexes | 🔴 Required | Database |
| scripts/backfill-userId-to-wheels.mjs | Backfill | 🔴 Required | Data |
| lib/dashboard.js (getProfileWheels) | Query | 🟡 High | Profile perf |
| lib/dashboard.js (buildDashboardData) | Query | 🟡 High | Dashboard perf |
| lib/dashboard.js (getDashboardWheels) | Query | 🟡 High | Dashboard perf |
| app/u/[username]/page.js | Caller | 🟡 High | Profile loading |
| app/api/wheel/create | Mutation | 🟡 High | Data integrity |
| lib/feedService.js | Query | 🟢 Medium | Feed performance |
| lib/topicPage.js | Query | 🟢 Medium | Topic page perf |
| app/api/wheel/* | Query/Mutation | 🟢 Medium | API routes |

---

## Questions?
- Backfill failures? Check MONGODB_URI and User collection data
- Performance not improving? Verify indexes were created: `db.wheels.getIndexes()`
- Need to revert? Just remove userId from queries; schema backward-compatible
