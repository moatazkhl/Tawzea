export interface Campaign {
  id: string;
  name: string;
  description?: string;
  center_name?: string;
  is_active: boolean;
  created_at: any;
}

export interface User {
  id?: string;
  national_id: string;
  family_card: string;
  full_name: string;
  phone: string;
  address: string;
  notes?: string;
  queue_index: number;
  status: 'waiting' | 'active' | 'delivered';
  delivered_at?: any;
  created_at: any;
  updated_at?: any;
  activated_at?: any;
  campaign_id: string; // ID of the campaign this registration belongs to
}

export type UserRole = 'admin' | 'distributor' | 'citizen';

export interface AuthState {
  role: UserRole;
  isAuthenticated: boolean;
}
