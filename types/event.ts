export interface Event {
  id: string;
  name: string;
  description: string;
  image?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  startTime: string;
  endTime: string;
  status: 'UPCOMING' | 'ONGOING' | 'ENDED';
  categoryId: string;
  regionId: string;
  creatorId: string;
  interestedCount: number;
  source?: string;
  createdAt: string;
  updatedAt: string;
  category?: {
    id: string;
    name: string;
  };
  region?: {
    id: string;
    name: string;
    code: string;
  };
  creator?: {
    id: string;
    name: string;
    email?: string;
  };
}

export interface EventCategory {
  id: string;
  name: string;
  description?: string;
}

export interface Region {
  id: string;
  name: string;
  code: string;
}
