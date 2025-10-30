# Database Field Analysis - Profile Setup

## Frontend Fields Collected (ProfileSetup.tsx)

### Basic Information Section:
- ✅ `firstName` → `users.first_name`
- ✅ `lastName` → `users.last_name`
- ✅ `email` → `users.email` (from Firebase, not editable)
- ✅ `phone` (countryCode + phoneNumber) → `users.phone`
- ✅ `profilePicture` → `users.profile_image_url` (via file upload)

### Education Section:
- ✅ `qualification` → `user_profiles.education[].degree`
- ✅ `qualificationOther` → `user_profiles.education[].degree` (if "other" selected)
- ✅ `college` → `user_profiles.education[].institution`
- ✅ `currentSemester` → `user_profiles.education[].currentSemester`
- ✅ `yearOfPassing` → `user_profiles.education[].startDate` & `endDate`

### Skills Section:
- ✅ `skills` (array) → `user_profiles.skills` (JSONB array)

### Interested Roles Section:
- ✅ `interestedRoles` → `user_profiles.target_roles` (JSONB array)

### Resume Section:
- ✅ `resume` (file) → Uploaded to `files` table, then `user_profiles.resume_url` stores file path

---

## Database Fields Status

### `users` Table - ✅ All Used
| Field | Collected? | Status |
|-------|-----------|--------|
| `first_name` | ✅ Yes | Required |
| `last_name` | ✅ Yes | Required |
| `email` | ✅ Yes (Firebase) | Required |
| `phone` | ✅ Yes | Optional |
| `profile_image_url` | ✅ Yes | Optional |
| `preferences` | ⚠️ Partial | Used for other preferences, `targetRoles` moved to `user_profiles` |

### `user_profiles` Table - Mixed
| Field | Collected? | Status |
|-------|-----------|--------|
| `resume_url` | ✅ Yes | Required |
| `resume_text` | ❌ No | **Not extracted** - Could be added later for search |
| `skills` | ✅ Yes | Required |
| `experience_years` | ❌ No | Always `null` - **Not collected, could be optional for future** |
| `education` | ✅ Yes | Required |
| `certifications` | ❌ No | Always `[]` - **Not collected, optional for future** |
| `languages` | ❌ No | Always `[]` - **Not collected, optional for future** |
| `target_roles` | ✅ Yes | Required (stored here, not in `users.preferences`) |

### `files` Table - Mixed Usage
| Field | Used? | Notes |
|-------|-------|-------|
| `file_data BYTEA` | ❌ No | Always `[null]` - Files stored on filesystem, not in DB |
| `file_path` | ✅ Yes | Used for filesystem storage |
| `is_processed` | ❌ No | Always `false` - **Not used** |
| `processing_status` | ❌ No | Always `'pending'` - **Not used** |
| `checksum` | ❌ No | Always `[null]` - **Not used** |

---

## Recommendations

### Fields to Keep (Optional, Future Use):
- ✅ `user_profiles.experience_years` - Keep as optional, may be used later
- ✅ `user_profiles.certifications` - Keep as optional, may be used later  
- ✅ `user_profiles.languages` - Keep as optional, may be used later
- ✅ `user_profiles.resume_text` - Keep for future text extraction/search

### Fields to Remove or Make Optional:
- ⚠️ `files.file_data` - Not used, files stored on filesystem
- ⚠️ `files.is_processed`, `processing_status`, `checksum` - Not used currently, but may be useful for future processing

### Action Items:
1. ✅ Verify all frontend-collected fields save correctly
2. ✅ Ensure optional fields (certifications, languages, experience_years) don't cause issues
3. ✅ Confirm `target_roles` is saved in `user_profiles`, not `users.preferences`
4. ✅ Verify `resume_url` is saved correctly (file ID converted to file path)


