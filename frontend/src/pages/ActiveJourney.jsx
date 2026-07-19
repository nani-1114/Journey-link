import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { useGeolocation } from '../hooks/useGeolocation';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Navigation,
  Compass,
  AlertTriangle,
  Clock,
  Gauge,
  MapPin,
  Copy,
  Check,
  Flag,
  PauseCircle,
  Share2
} from 'lucide-react';

// Center map wrapper to auto-zoom and auto-center
const MapController = ({ centerCoords, startCoords, destCoords }) => {
  const map = useMap();
  useEffect(() => {
    if (centerCoords) {
      map.setView([centerCoords.lat, centerCoords.lng], map.getZoom());
    }
  }, [centerCoords, map]);

  // Zoom to fit start and destination initially
  useEffect(() => {
    if (startCoords && destCoords) {
      const bounds = L.latLngBounds(
        [startCoords.lat, startCoords.lng],
        [destCoords.lat, destCoords.lng]
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [startCoords, destCoords, map]);

  return null;
};

const ActiveJourney = () => {
  const { trackingCode } = useParams();
  const { token, API_URL } = useAuth();
  const navigate = useNavigate();

  const [journeyInfo, setJourneyInfo] = useState(null);
  const [liveData, setLiveData] = useState(null);
  const [plannedRoute, setPlannedRoute] = useState([]);
  const [plannedDistance, setPlannedDistance] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  // Fetch planned route from OSRM
  useEffect(() => {
    const fetchPlannedRoute = async () => {
      if (!journeyInfo?.startLat || !journeyInfo?.destinationLat) return;
      if (journeyInfo.travelMode === 'TRAIN') {
        setPlannedRoute([]);
        // Calculate straight line distance as fallback for train
        const start = L.latLng(journeyInfo.startLat, journeyInfo.startLng);
        const dest = L.latLng(journeyInfo.destinationLat, journeyInfo.destinationLng);
        setPlannedDistance(start.distanceTo(dest) / 1000);
        return;
      }
      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${journeyInfo.startLng},${journeyInfo.startLat};${journeyInfo.destinationLng},${journeyInfo.destinationLat}?overview=full&geometries=geojson`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.routes && data.routes.length > 0) {
            const coords = data.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]);
            setPlannedRoute(coords);
            setPlannedDistance(data.routes[0].distance / 1000);
          }
        }
      } catch (err) {
        console.error('Error fetching planned route:', err);
      }
    };
    fetchPlannedRoute();
  }, [journeyInfo?.startLat, journeyInfo?.startLng, journeyInfo?.destinationLat, journeyInfo?.destinationLng, journeyInfo?.travelMode]);
  
  // Track last sent coords to prevent sending duplicate static packets
  const lastSentCoords = useRef({ lat: 0, lng: 0 });

  // 1. Fetch static journey information (start, dest, status)
  useEffect(() => {
    const fetchJourney = async () => {
      try {
        const response = await fetch(`${API_URL}/api/public/journey/${trackingCode}`);
        if (response.ok) {
          const data = await response.json();
          setJourneyInfo(data);
          if (data.status === 'COMPLETED') {
            navigate(`/analytics/${data.id}`);
          }
        } else {
          setError('Failed to load journey details');
        }
      } catch (err) {
        console.error('Error fetching journey:', err);
        setError('Connection error');
      }
    };
    fetchJourney();
  }, [trackingCode]);

  // 2. Setup WebSocket client to receive live telemetry updates
  const handleWsMessage = (data) => {
    setLiveData(data);
    if (data.status === 'COMPLETED') {
      navigate('/dashboard');
    }
  };
  const { sendLocation } = useWebSocket(trackingCode, handleWsMessage);

  // 3. Setup browser geolocation tracking
  const locationUpdateInterval = useRef(null);
  const currentCoords = useRef(null);

  const { coords, error: geoError, tracking, startTracking, stopTracking } = useGeolocation((newCoords) => {
    currentCoords.current = newCoords;
  });

  // Start tracking and define interval to publish location updates every 5 seconds
  useEffect(() => {
    startTracking();

    locationUpdateInterval.current = setInterval(() => {
      if (currentCoords.current) {
        const { latitude, longitude, speed } = currentCoords.current;
        // Verify if coordinates changed to avoid sending duplicate reports
        if (
          latitude !== lastSentCoords.current.lat ||
          longitude !== lastSentCoords.current.lng
        ) {
          sendLocation(latitude, longitude, speed);
          lastSentCoords.current = { lat: latitude, lng: longitude };
        }
      }
    }, 5000);

    return () => {
      stopTracking();
      if (locationUpdateInterval.current) {
        clearInterval(locationUpdateInterval.current);
      }
    };
  }, [sendLocation]);

  const handleEndJourney = async () => {
    if (!journeyInfo) return;
    try {
      const response = await fetch(`${API_URL}/api/journeys/${journeyInfo.id}/end`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        stopTracking();
        navigate('/dashboard');
      } else {
        setError('Failed to end journey');
      }
    } catch (err) {
      console.error('Error ending journey:', err);
    }
  };

  const copyShareLink = () => {
    const baseOrigin = import.meta.env.VITE_SHARE_URL || window.location.origin;
    const url = `${baseOrigin}/live/${trackingCode}`;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url)
        .then(() => setCopied(true))
        .catch(err => console.error('Clipboard copy failed:', err));
    } else {
      // Fallback for insecure HTTP connections
      const textArea = document.createElement("textarea");
      textArea.value = url;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
      } catch (err) {
        console.error('Fallback copy failed:', err);
      }
      document.body.removeChild(textArea);
    }
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center p-6 glass-panel rounded-2xl">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-red-400">Error Occurred</h3>
        <p className="text-slate-300 mt-2">{error}</p>
        <button onClick={() => navigate('/dashboard')} className="mt-6 px-4 py-2 bg-primary rounded-xl text-sm font-semibold">
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!journeyInfo) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const displayLat = liveData?.currentLat || coords?.latitude || journeyInfo.startLat;
  const displayLng = liveData?.currentLng || coords?.longitude || journeyInfo.startLng;
  const displaySpeed = liveData?.currentSpeed || coords?.speed || 0.0;
  const historyCoords = liveData?.history?.map(h => [h.latitude, h.longitude]) || [];

  const displayDistanceRemaining = plannedDistance !== null
    ? Math.max(0, plannedDistance - (liveData?.totalDistance || 0)).toFixed(2)
    : (liveData?.distanceRemaining !== undefined ? liveData.distanceRemaining : '---');

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col md:flex-row relative">
      {/* Telemetry Control Panel */}
      <div className="md:w-1/3 p-6 bg-slate-900 border-r border-white/5 flex flex-col justify-between overflow-y-auto max-h-screen">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Active Journey</span>
              <h2 className="text-2xl font-bold text-white">{journeyInfo.journeyName}</h2>
            </div>
            <button
              onClick={copyShareLink}
              className="flex items-center gap-1 text-xs text-primary-light hover:underline font-semibold bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg"
            >
              {copied ? <Check className="h-4 w-4 text-accent" /> : <Share2 className="h-4 w-4" />}
              <span>Share Link</span>
            </button>
          </div>

          {/* GPS Tracking status indicator */}
          <div className="flex items-center gap-2 p-3 bg-slate-950 border border-white/5 rounded-xl text-sm">
            <span className={`h-2 w-2 rounded-full ${tracking ? 'bg-accent animate-ping' : 'bg-red-500'}`}></span>
            <span className="text-slate-300">
              {tracking ? 'GPS tracking active (sending updates)' : 'GPS lookup inactive'}
            </span>
          </div>

          {/* Source and Destination Timeline */}
          <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Source</p>
                <p className="text-xs text-slate-300 font-medium">
                  {journeyInfo.startAddress || 'Unknown Source Location'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0"></div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Destination</p>
                <p className="text-xs text-slate-300 font-medium">
                  {journeyInfo.destinationAddress || 'Unknown Destination Location'}
                </p>
              </div>
            </div>
          </div>

          {/* Speed Limit Alerts */}
          {displaySpeed > 100.0 && (
            <div className="flex items-center gap-3 bg-red-950/40 border border-red-500/30 text-red-300 p-4 rounded-xl text-sm animate-bounce">
              <AlertTriangle className="h-6 w-6 shrink-0 text-red-400" />
              <div>
                <p className="font-bold">Speed Limit Warning!</p>
                <p className="text-xs text-red-400">Current speed exceeds 100 km/h.</p>
              </div>
            </div>
          )}

          {/* Stats Dashboard Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-white/5">
              <span className="text-slate-400 text-xs font-semibold uppercase">Current Speed</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-extrabold text-white">{displaySpeed}</span>
                <span className="text-slate-400 text-xs">km/h</span>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-white/5">
              <span className="text-slate-400 text-xs font-semibold uppercase">Avg / Max Speed</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-lg font-bold text-white">
                  {liveData?.avgSpeed || 0} / {liveData?.maxSpeed || 0}
                </span>
                <span className="text-slate-400 text-xs">km/h</span>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-white/5">
              <span className="text-slate-400 text-xs font-semibold uppercase">Distance Remaining</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-extrabold text-white">
                  {displayDistanceRemaining}
                </span>
                <span className="text-slate-400 text-xs">km</span>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-white/5">
              <span className="text-slate-400 text-xs font-semibold uppercase">Estimated ETA</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold text-white text-primary-light">
                  {liveData?.etaSeconds !== undefined && liveData.etaSeconds > 0
                    ? `${Math.round(liveData.etaSeconds / 60)} mins`
                    : '---'}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-4 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Distance Travelled:</span>
              <span className="font-semibold">{liveData?.totalDistance || 0} km</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Time Started:</span>
              <span className="font-semibold">{new Date(journeyInfo.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <button
          onClick={handleEndJourney}
          className="w-full py-4 mt-8 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-600/10"
        >
          <PauseCircle className="h-5 w-5" />
          End Journey & Save
        </button>
      </div>

      {/* Map display */}
      <div className="flex-1 bg-slate-950 h-[400px] md:h-auto relative z-10">
        <MapContainer
          center={[displayLat, displayLng]}
          zoom={15}
          scrollWheelZoom={true}
          className="h-full w-full dark-map"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {/* Map controller to pan coordinates dynamically */}
          <MapController
            centerCoords={{ lat: displayLat, lng: displayLng }}
            startCoords={{ lat: journeyInfo.startLat, lng: journeyInfo.startLng }}
            destCoords={{ lat: journeyInfo.destinationLat, lng: journeyInfo.destinationLng }}
          />

          {/* Current Position Pin (Pulsing Blue GPS Dot) */}
          <Marker
            position={[displayLat, displayLng]}
            icon={L.divIcon({
              className: 'custom-gps-icon',
              html: '<div class="gps-pulse-dot"></div>',
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            })}
          />

          {/* Destination Pin */}
          <Marker
            position={[journeyInfo.destinationLat, journeyInfo.destinationLng]}
            icon={L.icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
            })}
          />

          {/* Planned route outline */}
          {journeyInfo.travelMode === 'TRAIN' ? (
            // Draw railway tracks: a solid black line and a dashed white line on top!
            <>
              <Polyline
                positions={[
                  [journeyInfo.startLat, journeyInfo.startLng],
                  [journeyInfo.destinationLat, journeyInfo.destinationLng]
                ]}
                color="#000000"
                weight={6}
                opacity={0.8}
              />
              <Polyline
                positions={[
                  [journeyInfo.startLat, journeyInfo.startLng],
                  [journeyInfo.destinationLat, journeyInfo.destinationLng]
                ]}
                color="#ffffff"
                weight={3}
                dashArray="8, 8"
                opacity={0.9}
              />
            </>
          ) : plannedRoute.length > 0 ? (
            <Polyline
              positions={plannedRoute}
              color={journeyInfo.travelMode === 'BUS' ? '#f97316' : '#2563eb'}
              weight={5}
              opacity={0.6}
              dashArray={journeyInfo.travelMode === 'BUS' ? '5, 5' : null}
            />
          ) : (
            journeyInfo && (
              <Polyline
                positions={[
                  [journeyInfo.startLat, journeyInfo.startLng],
                  [journeyInfo.destinationLat, journeyInfo.destinationLng]
                ]}
                color={journeyInfo.travelMode === 'BUS' ? '#f97316' : '#2563eb'}
                weight={3}
                dashArray="5, 10"
                opacity={0.5}
              />
            )
          )}

          {/* Journey Path Polyline */}
          {historyCoords.length > 0 && (
            <Polyline positions={historyCoords} color="#10b981" weight={5} opacity={0.9} />
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default ActiveJourney;
