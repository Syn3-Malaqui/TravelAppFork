export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          bio: string;
          verified: boolean;
          followers_count: number;
          following_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name: string;
          avatar_url?: string | null;
          bio?: string;
          verified?: boolean;
          followers_count?: number;
          following_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string;
          avatar_url?: string | null;
          bio?: string;
          verified?: boolean;
          followers_count?: number;
          following_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      tweets: {
        Row: {
          id: string;
          content: string;
          author_id: string;
          reply_to: string | null;
          image_urls: string[];
          hashtags: string[];
          mentions: string[];
          tags: string[]; // Added tags field
          likes_count: number;
          retweets_count: number;
          replies_count: number;
          views_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          content: string;
          author_id: string;
          reply_to?: string | null;
          image_urls?: string[];
          hashtags?: string[];
          mentions?: string[];
          tags?: string[]; // Added tags field
          likes_count?: number;
          retweets_count?: number;
          replies_count?: number;
          views_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          content?: string;
          author_id?: string;
          reply_to?: string | null;
          image_urls?: string[];
          hashtags?: string[];
          mentions?: string[];
          tags?: string[]; // Added tags field
          likes_count?: number;
          retweets_count?: number;
          replies_count?: number;
          views_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      likes: {
        Row: {
          id: string;
          user_id: string;
          tweet_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tweet_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          tweet_id?: string;
          created_at?: string;
        };
      };
      retweets: {
        Row: {
          id: string;
          user_id: string;
          tweet_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tweet_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          tweet_id?: string;
          created_at?: string;
        };
      };
      bookmarks: {
        Row: {
          id: string;
          user_id: string;
          tweet_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tweet_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          tweet_id?: string;
          created_at?: string;
        };
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}