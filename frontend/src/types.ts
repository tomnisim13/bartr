import { ItemStatus } from './config';

export interface Item {
  id: number;
  name: string;
  description: string | null;
  points_value: number;
  status: ItemStatus;
  image_url: string | null;
  created_at: string;
}
