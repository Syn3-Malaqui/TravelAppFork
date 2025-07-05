export type UserRole = 'user' | 'moderator' | 'admin';

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
          country: string;
          created_at: string;
          updated_at: string;
          role: UserRole;
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
          country?: string;
          created_at?: string;
          updated_at?: string;
          role?: UserRole;
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
          country?: string;
          created_at?: string;
          updated_at?: string;
          role?: UserRole;
        };
      };
      tweets: {
        Row: {
          id: string;
          content: string;
          author_id: string;
          reply_to: string | null;
          image_urls: string[];
          video_urls?: string[];
          hashtags: string[];
          mentions: string[];
          tags: string[];
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
          video_urls?: string[];
          hashtags?: string[];
          mentions?: string[];
          tags?: string[];
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
          video_urls?: string[];
          hashtags?: string[];
          mentions?: string[];
          tags?: string[];
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
      is_admin: {
        Args: {};
        Returns: boolean;
      };
      is_moderator_or_admin: {
        Args: {};
        Returns: boolean;
      };
      get_user_role: {
        Args: {};
        Returns: UserRole;
      };
    };
    Enums: {
      user_role: UserRole;
    };
  };
}