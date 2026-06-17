import { ItemStatus, TransactionType } from './config';

export interface Item {
  id: number;
  name: string;
  description: string | null;
  points_value: number;
  status: ItemStatus;
  image_url: string | null;
  created_at: string;
  distance_km?: number;
  // Populated only when config.debug.SHOW_OWNER_DEBUG is on (server-side gated).
  owner_display_name?: string | null;
}

export interface Match {
  id: number;
  user_one_id: string;
  user_two_id: string;
  created_at: string;
}

export interface UserProfile {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  balance_points: number;
}

export interface WalletTransaction {
  id: number;
  wallet_id: number;
  type: TransactionType;
  amount: number;
  balance_after: number;
  reference_id: string | null;
  description: string | null;
  created_at: string;
}
