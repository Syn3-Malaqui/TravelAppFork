# Admin Pin Functionality

## Overview

The admin pin functionality has been enhanced to allow verified administrators to pin **any tweet** to the home timeline, not just their own tweets. Additionally, when an admin pins a retweet, the system automatically pins the original tweet instead.

## Features

### 1. Admin Can Pin Any Tweet
- **Before**: Admins could only pin their own tweets to the home timeline
- **After**: Admins can pin any tweet (from any user) to the home timeline
- The pin option appears in the dropdown menu for all tweets when viewed by an admin

### 2. Automatic Retweet Handling
- When an admin tries to pin a retweet, the system automatically pins the original tweet instead
- This ensures that the original content gets featured, not just the retweet
- The UI shows a special message indicating this behavior

### 3. Enhanced UI Experience
- Pin option text changes based on tweet type:
  - Regular tweets: "Pin to home timeline"
  - Retweets: "Pin original to home" (indicating the original will be pinned)
- Available in both desktop (`TweetCard.tsx`) and mobile (`MobileTweetCard.tsx`) interfaces

## Database Changes

### New Functions

#### `pin_tweet_to_home(input_tweet_id UUID)`
- Enhanced to detect retweets and pin the original tweet instead
- Returns detailed JSON response including:
  - `input_tweet_id`: The tweet ID that was requested to be pinned
  - `pinned_tweet_id`: The actual tweet ID that was pinned (original if retweet)
  - `was_retweet`: Boolean indicating if the input was a retweet
  - `message`: Descriptive message about what happened

#### `unpin_tweet_from_home(input_tweet_id UUID)`
- Enhanced to handle retweets similarly when unpinning
- Automatically unpins the original tweet if a retweet ID is provided

#### `get_effective_tweet_id(input_tweet_id UUID)`
- Utility function that returns the original tweet ID for retweets
- Returns the same ID for regular tweets

## UI Changes

### TweetCard.tsx & MobileTweetCard.tsx
- Moved admin pin functionality outside the `isOwnTweet` condition
- Added special text for retweet pinning
- Reorganized dropdown menu structure:
  - User's own tweet options (pin to profile, delete)
  - Admin options (pin to home - available for any tweet)
  - Other user's tweet options (view profile, mute, report)

### usePinnedTweets.ts
- Updated to use new parameter names (`input_tweet_id` instead of `tweet_id`)
- Added logging for retweet conversion behavior
- Enhanced error handling and success messaging

## How It Works

1. **Admin views any tweet**: The dropdown menu shows the pin option regardless of tweet ownership
2. **Admin clicks pin**: The system checks if the tweet is a retweet
3. **If retweet**: The original tweet is pinned instead, with appropriate messaging
4. **If regular tweet**: The tweet is pinned normally
5. **Visual feedback**: The UI updates to show the pinned status

## Testing

Use the provided `test_admin_pin_functionality.sql` script to:
- Verify admin status
- Test retweet detection
- Test the effective tweet ID function
- Manually test pinning behavior

## Permissions

- Only verified administrators can pin tweets to home timeline
- User must have both `verified = true` AND (`role = 'admin'` OR `username = 'admin'`)
- Regular users can still only pin their own tweets to their profile

## Benefits

1. **Better Content Curation**: Admins can highlight any valuable content
2. **Original Content Focus**: Retweets automatically promote the original creator
3. **Improved UX**: Clear messaging about what will happen when pinning retweets
4. **Consistent Behavior**: Works the same way across desktop and mobile interfaces 