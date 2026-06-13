export interface Item {
  id: number;
  name: string;
  description: string | null;
  points_value: number;
  status: number;
  image_url: string | null;
  created_at: string;
}
