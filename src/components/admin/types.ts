import type { Item, RecipeSubmission } from "@/lib/types";

export interface Recipe {
  id: number;
  result_item_id: number;
  result_name: string;
  ingredient_item_id: number;
  ingredient_name: string;
  quantity: number;
}

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

export interface DataStats {
  items: number;
  recipes: number;
  base_materials: number;
  craftable: number;
  categories: number;
  with_difficulty: number;
  with_skill_type: number;
  with_base_time: number;
  with_tool_type: number;
}

export interface AdminMessage {
  type: "success" | "error";
  text: string;
}

export type { Item, RecipeSubmission };
