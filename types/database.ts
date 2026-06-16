export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          handle: string;
          display_name: string;
          bio: string;
          avatar_url: string | null;
          expo_push_token: string | null;
          is_online: boolean;
          last_seen_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          handle: string;
          display_name?: string;
          bio?: string;
          avatar_url?: string | null;
          expo_push_token?: string | null;
          is_online?: boolean;
          last_seen_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          handle?: string;
          display_name?: string;
          bio?: string;
          avatar_url?: string | null;
          expo_push_token?: string | null;
          is_online?: boolean;
          last_seen_at?: string;
          updated_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          participant_1_id: string;
          participant_2_id: string;
          last_message_id: string | null;
          last_message_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          participant_1_id: string;
          participant_2_id: string;
          last_message_id?: string | null;
          last_message_at?: string;
          created_at?: string;
        };
        Update: {
          last_message_id?: string | null;
          last_message_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          message_type: 'text' | 'image' | 'sticker';
          content: string | null;
          image_url: string | null;
          image_width: number | null;
          image_height: number | null;
          read_at: string | null;
          is_deleted: boolean;
          reply_to_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          message_type?: 'text' | 'image' | 'sticker';
          content?: string | null;
          image_url?: string | null;
          image_width?: number | null;
          image_height?: number | null;
          read_at?: string | null;
          is_deleted?: boolean;
          reply_to_id?: string | null;
          created_at?: string;
        };
        Update: {
          content?: string | null;
          image_url?: string | null;
          image_width?: number | null;
          image_height?: number | null;
          read_at?: string | null;
          is_deleted?: boolean;
          reply_to_id?: string | null;
        };
      };
      friendships: {
        Row: {
          id: string;
          requester_id: string;
          addressee_id: string;
          status: 'pending' | 'accepted' | 'rejected';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          requester_id: string;
          addressee_id: string;
          status?: 'pending' | 'accepted' | 'rejected';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: 'pending' | 'accepted' | 'rejected';
          updated_at?: string;
        };
      };
      profile_photos: {
        Row: {
          id: string;
          user_id: string;
          photo_url: string;
          caption: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          photo_url: string;
          caption?: string | null;
          created_at?: string;
        };
        Update: {
          photo_url?: string;
          caption?: string | null;
        };
      };
      blocked_users: {
        Row: {
          id: string;
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          blocker_id: string;
          blocked_id: string;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
      typing_indicators: {
        Row: {
          conversation_id: string;
          user_id: string;
          is_typing: boolean;
          updated_at: string;
        };
        Insert: {
          conversation_id: string;
          user_id: string;
          is_typing?: boolean;
          updated_at?: string;
        };
        Update: {
          is_typing?: boolean;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type UserProfile = Database['public']['Tables']['users']['Row'];
export type Conversation = Database['public']['Tables']['conversations']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type Friendship = Database['public']['Tables']['friendships']['Row'];

export type ConversationWithUser = Conversation & {
  other_user: UserProfile;
  last_message?: Message | null;
};

export type ProfilePhoto = Database['public']['Tables']['profile_photos']['Row'];

export interface GroupChat {
  id: string;
  name: string;
  created_by: string;
  last_message_at: string;
  created_at: string;
}

export interface GroupChatMessage {
  id: string;
  group_chat_id: string;
  sender_id: string;
  content: string | null;
  message_type: 'text' | 'image' | 'sticker';
  image_url: string | null;
  is_deleted: boolean;
  reply_to_id: string | null;
  created_at: string;
}

export type GroupChatWithDetails = GroupChat & {
  members: UserProfile[];
  last_message?: GroupChatMessage | null;
};
