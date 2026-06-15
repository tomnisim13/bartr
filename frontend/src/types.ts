import { ItemStatus } from './config';

export interface Item {
  id: number;
  name: string;
  description: string | null;
  points_value: number;
  status: ItemStatus;
  image_url: string | null;
  created_at: string;
  distance_km?: number;
}

export interface Match {
  id: number;
  user_one_id: string;
  user_two_id: string;
  created_at: string;
}
