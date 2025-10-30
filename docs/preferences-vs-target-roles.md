# Preferences vs Target Roles - Design Explanation

## Current Database Structure

### `users.preferences` (JSONB)
- **Location**: `users` table
- **Purpose**: General application-level user preferences
- **Current State**: Empty `{}` (not actively used)
- **Future Use Cases**:
  - Notification settings
  - UI theme preferences
  - Email frequency settings
  - General app configuration

### `user_profiles.target_roles` (JSONB)
- **Location**: `user_profiles` table
- **Purpose**: Professional profile data - roles user is interested in
- **Current State**: Contains actual data (e.g., `["Software Engineer", "Frontend Developer"]`)
- **Why Here**: It's part of the user's professional profile, not general app preferences

## Why This Design?

### Separation of Concerns:
1. **Profile Data** (`user_profiles`) = Professional information
   - Skills, education, experience
   - Target roles
   - Resume
   
2. **App Preferences** (`users.preferences`) = Application settings
   - UI/UX preferences
   - Notification settings
   - App behavior

### Benefits:
- ✅ Clear separation between profile and preferences
- ✅ Efficient querying (profile data in one table)
- ✅ Scalability (can add more preference types without cluttering profile)
- ✅ Logical grouping (target roles are career-related, not app settings)

## Current Response Structure

The API response currently maps `target_roles` from `user_profiles` to `preferences.targetRoles` in the response for frontend compatibility:

```javascript
// Backend response
{
  preferences: {
    targetRoles: profile.target_roles || []  // From user_profiles, not users.preferences
  }
}
```

## Options Going Forward

### Option 1: Keep Current Structure (Recommended)
- Keep `target_roles` in `user_profiles`
- Keep `preferences` in `users` for future use
- Maintain response mapping for frontend compatibility

### Option 2: Consolidate to `users.preferences`
- Move `target_roles` to `users.preferences.targetRoles`
- Remove `target_roles` from `user_profiles`
- **Requires**: Database migration + code refactor

### Option 3: Remove `users.preferences`
- Only keep `user_profiles.target_roles`
- Remove unused `preferences` column
- **Requires**: Database migration

## Recommendation

**Keep Option 1** - The current design is clean and logical. `target_roles` belongs in the profile because it's professional data, while `preferences` can be used for actual app preferences in the future.

## Action Taken

- ✅ Removed `preferences` update from user save logic (it's not being populated)
- ✅ `target_roles` correctly saved in `user_profiles.target_roles`
- ✅ Response mapping maintained for frontend compatibility


