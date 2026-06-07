export interface Turf {
  id: string;
  name: string;
  address: string;
  coordinates?: string;
  price: number;
  imageurl?: string;
  ownerId?: string;
  ownerName?: string;
  rating?: number;
  sport?: string[];
  formats?: string[];
  amenities?: string[];
  availability?: string;
  active?: boolean;
  createdAt?: Date;
}
