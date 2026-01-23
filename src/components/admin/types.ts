import type { Item } from "@/lib/types";

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: "user" | "admin";
  display_name?: string;
  location?: string;
  wurm_server?: string;
  show_in_members_list: boolean;
  is_banned: boolean;
  ban_reason?: string;
  created_at: string;
}

export interface UserStats {
  total: number;
  visible: number;
  banned: number;
  admins: number;
}

export interface AdminMessage {
  type: "success" | "error";
  text: string;
}

export type { Item };
