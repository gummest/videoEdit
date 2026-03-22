export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

export interface DashboardStats {
  videos: number;
  clips: number;
  totalMinutes: number;
}
