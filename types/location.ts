export type GeofenceLocation = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type GeofenceDraft = {
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
};
