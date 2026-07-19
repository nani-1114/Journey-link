import { useState, useEffect, useRef } from 'react';

export const useGeolocation = (onLocationUpdate) => {
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState(null);
  const [tracking, setTracking] = useState(false);
  const watchIdRef = useRef(null);

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setError(null);
    setTracking(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed } = position.coords;
        // GPS speed is in m/s, convert to km/h (speed * 3.6). Fallback to 0.0 if null
        const speedKmh = speed ? Math.round(speed * 3.6 * 10) / 10 : 0.0;
        const newCoords = { latitude, longitude, speed: speedKmh };
        
        setCoords(newCoords);
        if (onLocationUpdate) {
          onLocationUpdate(newCoords);
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
    setCoords(null);
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return { coords, error, tracking, startTracking, stopTracking };
};
export default useGeolocation;
