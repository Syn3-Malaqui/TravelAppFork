import { supabase } from './supabase';

/**
 * Delete all tweets while maintaining users and their relationships
 * This function removes all tweet content and associated data but preserves user profiles and follow relationships
 * 
 * @returns Promise<{ success: boolean; message: string; counts?: any }>
 */
export async function deleteAllTweets(): Promise<{ success: boolean; message: string; counts?: any }> {
  try {
    console.log('Starting tweet deletion process...');

    // Step 1: Delete all bookmarks (references tweet_id)
    console.log('Deleting bookmarks...');
    const { error: bookmarksError } = await supabase
      .from('bookmarks')
      .delete()
      .neq('id', ''); // Delete all records

    if (bookmarksError) {
      throw new Error(`Failed to delete bookmarks: ${bookmarksError.message}`);
    }

    // Step 2: Delete all likes (references tweet_id)
    console.log('Deleting likes...');
    const { error: likesError } = await supabase
      .from('likes')
      .delete()
      .neq('id', ''); // Delete all records

    if (likesError) {
      throw new Error(`Failed to delete likes: ${likesError.message}`);
    }

    // Step 3: Delete all retweets (references tweet_id)
    console.log('Deleting retweets...');
    const { error: retweetsError } = await supabase
      .from('retweets')
      .delete()
      .neq('id', ''); // Delete all records

    if (retweetsError) {
      throw new Error(`Failed to delete retweets: ${retweetsError.message}`);
    }

    // Step 4: Delete all tweets (main tweet content)
    console.log('Deleting tweets...');
    const { error: tweetsError } = await supabase
      .from('tweets')
      .delete()
      .neq('id', ''); // Delete all records

    if (tweetsError) {
      throw new Error(`Failed to delete tweets: ${tweetsError.message}`);
    }

    // Step 5: Get verification counts
    console.log('Verifying deletion...');
    const [tweetsCount, likesCount, retweetsCount, bookmarksCount, profilesCount, followsCount] = await Promise.all([
      supabase.from('tweets').select('id', { count: 'exact', head: true }),
      supabase.from('likes').select('id', { count: 'exact', head: true }),
      supabase.from('retweets').select('id', { count: 'exact', head: true }),
      supabase.from('bookmarks').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('follows').select('id', { count: 'exact', head: true })
    ]);

    const counts = {
      tweets: tweetsCount.count || 0,
      likes: likesCount.count || 0,
      retweets: retweetsCount.count || 0,
      bookmarks: bookmarksCount.count || 0,
      profiles: profilesCount.count || 0,
      follows: followsCount.count || 0
    };

    console.log('Tweet deletion completed successfully!');
    console.log('Remaining records:', counts);

    return {
      success: true,
      message: 'All tweets deleted successfully while preserving users and relationships',
      counts
    };

  } catch (error: any) {
    console.error('Error during tweet deletion:', error);
    return {
      success: false,
      message: `Failed to delete tweets: ${error.message}`
    };
  }
}

/**
 * Alternative function using raw SQL for more efficient deletion
 * Only use this if you have RLS (Row Level Security) disabled or appropriate permissions
 */
export async function deleteAllTweetsRaw(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('Starting raw SQL tweet deletion...');

    // Execute raw SQL queries in sequence
    const queries = [
      'DELETE FROM bookmarks',
      'DELETE FROM likes', 
      'DELETE FROM retweets',
      'DELETE FROM tweets'
    ];

    for (const query of queries) {
      console.log(`Executing: ${query}`);
      const { error } = await supabase.rpc('exec_sql', { query });
      if (error) {
        throw new Error(`Failed to execute ${query}: ${error.message}`);
      }
    }

    console.log('Raw SQL tweet deletion completed successfully!');
    return {
      success: true,
      message: 'All tweets deleted successfully using raw SQL'
    };

  } catch (error: any) {
    console.error('Error during raw SQL tweet deletion:', error);
    return {
      success: false,
      message: `Failed to delete tweets: ${error.message}`
    };
  }
} 