import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GPSPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

export function useGPSTracking() {
  const [position, setPosition] = useState<GPSPosition | null>(null);
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logLocation = useCallback(async (
    accountId: string | null,
    eventType: 'arrival' | 'departure' | 'tracking'
  ) => {
    if (!position) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('location_logs').insert({
      user_id: user.id,
      account_id: accountId,
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy,
      event_type: eventType,
      timestamp: position.timestamp.toISOString(),
    });

    if (error) {
      console.error('Error logging location:', error);
      toast.error('Failed to log location');
    } else {
      toast.success(eventType === 'arrival' ? 'Arrival logged' : 'Departure logged');
    }
  }, [position]);

  useEffect(() => {
    if (!tracking) return;

    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: new Date(pos.timestamp),
        });
        setError(null);
      },
      (err) => {
        setError(err.message);
        toast.error(`GPS Error: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 5000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [tracking]);

  const startTracking = useCallback(() => {
    setTracking(true);
  }, []);

  const stopTracking = useCallback(() => {
    setTracking(false);
  }, []);

  return {
    position,
    tracking,
    error,
    startTracking,
    stopTracking,
    logLocation,
  };
}
