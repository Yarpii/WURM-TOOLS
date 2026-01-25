export interface UserProfile {
  id: number;
  username: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  location?: string;
  wurm_server?: string;
  show_in_members_list: boolean;
  show_location: boolean;
}

export type TabType = "profile" | "privacy" | "security";

export interface SessionInfo {
  id: string;
  deviceName?: string;
  ipAddress?: string;
  lastActiveAt?: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface ProfileFormData {
  display_name: string;
  bio: string;
  avatar_url: string;
  banner_url: string;
  location: string;
  wurm_server: string;
}

export interface PrivacyFormData {
  show_in_members_list: boolean;
  show_location: boolean;
}

export interface PasswordFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface DeleteFormData {
  password: string;
  confirmation: string;
}

export interface EmailStatus {
  email: string | null;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  emailConfigured: boolean;
}

export interface EmailFormData {
  email: string;
  code: string;
}
