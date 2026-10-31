export type Role = "site_admin" | "care_seeker" | "care_provider";
export type PublicRole = Exclude<Role, "site_admin">;

export interface NavigationItem {
  id: string;
  label: string;
}

export interface UserProfile {
  id: string;
  email: string;
  phone_number: string;
  role: Role;
  is_active: boolean;
  is_verified: boolean;
  phone_verified: boolean;
  created_at?: string;
  navigation: NavigationItem[];
}

export interface RegisterRequest {
  email: string;
  password: string;
  phone_number: string;
  role: PublicRole;
}

export interface AuthResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  user: UserProfile;
}

export interface AuditEvent {
  id: number;
  actor_id: string | null;
  action: string;
  created_at: string;
}
