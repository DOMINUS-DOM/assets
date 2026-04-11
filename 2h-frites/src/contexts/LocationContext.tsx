'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { api } from '@/lib/api';

interface Location {
  id: string;
  name: string;
  slug: string;
  active: boolean;
}

interface LocationContextType {
  locationId: string | null; // null = all locations
  locationName: string;
  locations: Location[];
  setLocationId: (id: string | null) => void;
  canSwitch: boolean;
}

const LocationContext = createContext<LocationContextType | null>(null);
const STORAGE_KEY = '2h-location';

export function LocationProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, hasRole } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const canSwitch = hasRole('franchisor_admin');

  // Load locations list
  useEffect(() => {
    if (!isAuthenticated) return;
    api.get<any>('/locations')
      .then((data) => {
        const locs = Array.isArray(data) ? data : data?.locations || [];
        setLocations(locs);
      })
      .catch(() => {});
  }, [isAuthenticated]);

  // Determine active location
  useEffect(() => {
    if (!user) return;

    if (canSwitch) {
      // franchisor_admin: restore from localStorage or default to first location
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && stored !== 'all') {
          setSelectedId(stored);
        } else if (stored === 'all') {
          setSelectedId(null);
        } else if (locations.length > 0) {
          setSelectedId(locations[0].id);
        }
      } catch {
        if (locations.length > 0) setSelectedId(locations[0].id);
      }
    } else {
      // Other roles: locked to their assigned location
      setSelectedId(user.locationId || null);
    }
    setLoaded(true);
  }, [user, canSwitch, locations]);

  const setLocationId = useCallback((id: string | null) => {
    setSelectedId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id || 'all');
    } catch {}
  }, []);

  const locationName = selectedId
    ? locations.find((l) => l.id === selectedId)?.name || 'Site'
    : 'Tous les sites';

  return (
    <LocationContext.Provider value={{
      locationId: selectedId,
      locationName,
      locations,
      setLocationId,
      canSwitch,
    }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used within LocationProvider');
  return ctx;
}
