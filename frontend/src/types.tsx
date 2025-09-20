export interface Board {
  id: number;
  title: string;
  owner_id: number;
  thumbnail_url: string;
}

export interface Card {
  id: number;
  text: string;
  position_x: number;
  position_y: number;
}