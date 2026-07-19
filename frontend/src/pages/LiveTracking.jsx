import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Compass,
  AlertTriangle,
  Clock,
  Gauge,
  MapPin,
  Lock,
  CheckCircle,
  Flag,
  Navigation
} from 'lucide-react';

const MapController = ({ centerCoords, startCoords, destCoords }) => {
  const map = useMap();
  useEffect(() => {
    if (centerCoords) {
      map.setView([centerCoords.lat, centerCoords.lng], map.getZoom());
    }
  }, [centerCoords, map]);

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

const LiveTracking = () => {
  const { trackingCode } = useParams();
  const { API_URL } = useAuth();

  const [liveData, setLiveData] = useState(null);
  const [plannedRoute, setPlannedRoute] = useState([]);
  const [plannedDistance, setPlannedDistance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch planned route from OSRM
  useEffect(() => {
    const fetchPlannedRoute = async () => {
      if (!liveData?.startLat || !liveData?.destinationLat) return;
      if (liveData.travelMode === 'TRAIN') {
        setPlannedRoute([]);
        // Calculate straight line distance as fallback for train
        const start = L.latLng(liveData.startLat, liveData.startLng);
        const dest = L.latLng(liveData.destinationLat, liveData.destinationLng);
        setPlannedDistance(start.distanceTo(dest) / 1000);
        return;
      }
      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${liveData.startLng},${liveData.startLat};${liveData.destinationLng},${liveData.destinationLat}?overview=full&geometries=geojson`
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
  }, [liveData?.startLat, liveData?.startLng, liveData?.destinationLat, liveData?.destinationLng, liveData?.travelMode]);

  // Password-lock configurations
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Load initial journey state & check if password protected
  const fetchLiveTelemetry = async (pw = '') => {
    try {
      const response = await fetch(`${API_URL}/api/public/journey/${trackingCode}/live?password=${pw}`);
      const data = await response.json();

      if (response.ok) {
        setLiveData(data);
        setPasswordRequired(false);
        setPasswordError('');
        setError('');
      } else if (response.status === 401 && data.passwordRequired) {
        setPasswordRequired(true);
        if (pw) {
          setPasswordError('Incorrect password');
        }
      } else if (response.status === 410) {
        setError('This tracking link has expired');
      } else {
        setError(data.error || 'Failed to load live tracking details');
      }
    } catch (err) {
      console.error('Error fetching live tracking:', err);
      setError('Connection to server failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveTelemetry();
  }, [trackingCode]);

  // Hook into WebSocket to capture real-time broadcast coordinate streams
  const handleWsUpdate = (data) => {
    setLiveData(data);
  };
  useWebSocket(passwordRequired ? null : trackingCode, handleWsUpdate);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    fetchLiveTelemetry(password);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Render password protection screen
  if (passwordRequired) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex justify-center items-center px-4 relative">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10 animate-pulse-slow"></div>
        
        <div className="w-full max-w-md glass-panel p-8 rounded-2xl shadow-2xl">
          <div className="flex flex-col items-center mb-6">
            <div className="bg-yellow-500/10 p-3 rounded-xl text-yellow-500 mb-3 border border-yellow-500/20">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold">Password Required</h3>
            <p className="text-slate-400 text-sm text-center mt-1">
              This live tracking link is password-protected. Please enter password to view tracking map.
            </p>
          </div>

          {passwordError && (
            <div className="bg-red-950/40 border border-red-500/30 text-red-300 px-3 py-2 rounded-lg text-xs mb-4 text-center">
              {passwordError}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary text-sm"
            />
            <button
              type="submit"
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300"
            >
              Verify & Unlock
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center p-6 glass-panel rounded-2xl">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-red-400">Link Unavailable</h3>
        <p className="text-slate-300 mt-2">{error}</p>
        <Link to="/" className="mt-6 inline-block px-4 py-2 bg-primary rounded-xl text-sm font-semibold">
          Go Home
        </Link>
      </div>
    );
  }

  if (!liveData) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex justify-center items-center text-slate-400">
        Waiting for telemetry...
      </div>
    );
  }

  const currentLat = liveData.currentLat;
  const currentLng = liveData.currentLng;
  const currentSpeed = liveData.currentSpeed;
  const historyCoords = liveData.history?.map(h => [h.latitude, h.longitude]) || [];

  const displayDistanceRemaining = plannedDistance !== null
    ? Math.max(0, plannedDistance - (liveData?.totalDistance || 0)).toFixed(2)
    : (liveData?.distanceRemaining !== undefined ? liveData.distanceRemaining : '---');

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col md:flex-row relative">
      {/* Telemetry Display Sidebar */}
      <div className="md:w-1/3 p-6 bg-slate-900 border-r border-white/5 flex flex-col justify-between overflow-y-auto max-h-screen">
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  liveData.status === 'ACTIVE'
                    ? 'bg-emerald-950/50 text-accent border border-accent/20'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                <span className={`h-1 w-1 rounded-full ${liveData.status === 'ACTIVE' ? 'bg-accent animate-ping' : 'bg-slate-400'}`}></span>
                {liveData.status}
              </span>
              {liveData.status === 'ACTIVE' && (
                <span className="text-[10px] text-accent font-medium uppercase tracking-wider animate-pulse">Live Updating</span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-white">{liveData.journeyName}</h2>
          </div>

          {/* Source and Destination Timeline */}
          <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Source</p>
                <p className="text-xs text-slate-300 font-medium">
                  {liveData.startAddress || 'Unknown Source Location'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0"></div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Destination</p>
                <p className="text-xs text-slate-300 font-medium">
                  {liveData.destinationAddress || 'Unknown Destination Location'}
                </p>
              </div>
            </div>
          </div>

          {/* Speed Limit warning banner */}
          {liveData.speedLimitExceeded && (
            <div className="flex items-center gap-3 bg-red-950/40 border border-red-500/30 text-red-300 p-4 rounded-xl text-sm animate-pulse">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
              <div>
                <p className="font-semibold text-xs">Speed Warning</p>
                <p className="text-[11px] text-red-400">Driver speed exceeds 100 km/h limit.</p>
              </div>
            </div>
          )}

          {/* Telemetry stats card grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-white/5">
              <span className="text-slate-400 text-xs font-semibold uppercase">Live Speed</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-extrabold text-white">{currentSpeed}</span>
                <span className="text-slate-400 text-xs">km/h</span>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-white/5">
              <span className="text-slate-400 text-xs font-semibold uppercase">Avg / Max Speed</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-lg font-bold text-white">
                  {liveData.avgSpeed} / {liveData.maxSpeed}
                </span>
                <span className="text-slate-400 text-xs">km/h</span>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-white/5">
              <span className="text-slate-400 text-xs font-semibold uppercase">Remaining Distance</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-extrabold text-white">{displayDistanceRemaining}</span>
                <span className="text-slate-400 text-xs">km</span>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-white/5">
              <span className="text-slate-400 text-xs font-semibold uppercase">Estimated ETA</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold text-white text-primary-light">
                  {liveData.etaSeconds > 0 ? `${Math.round(liveData.etaSeconds / 60)} mins` : 'Arrived'}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-4 space-y-3.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Distance Covered:</span>
              <span className="font-semibold">{liveData.totalDistance} km</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Route Status:</span>
              <span className="font-semibold text-accent-light">
                {liveData.status === 'COMPLETED' ? 'Destination Reached' : 'En Route'}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-950 rounded-xl border border-white/5 text-center mt-8">
          <p className="text-[11px] text-slate-500">
            Powered by **JourneyLink**
          </p>
        </div>
      </div>

      {/* Map display */}
      <div className="flex-1 bg-slate-950 h-[400px] md:h-auto relative z-10">
        <MapContainer
          center={[currentLat, currentLng]}
          zoom={15}
          scrollWheelZoom={true}
          className="h-full w-full dark-map"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController
            centerCoords={{ lat: currentLat, lng: currentLng }}
            startCoords={{ lat: liveData.startLat, lng: liveData.startLng }}
            destCoords={{ lat: liveData.destinationLat, lng: liveData.destinationLng }}
          />

          {/* Current location pin (Pulsing Blue GPS Dot) */}
          <Marker
            position={[currentLat, currentLng]}
            icon={L.divIcon({
              className: 'custom-gps-icon',
              html: '<div class="gps-pulse-dot"></div>',
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            })}
          />

          {/* Destination pin */}
          <Marker
            position={[liveData.destinationLat, liveData.destinationLng]}
            icon={L.icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
            })}
          />

          {/* Planned route outline */}
          {liveData.travelMode === 'TRAIN' ? (
            // Draw railway tracks: a solid black line and a dashed white line on top!
            <>
              <Polyline
                positions={[
                  [liveData.startLat, liveData.startLng],
                  [liveData.destinationLat, liveData.destinationLng]
                ]}
                color="#000000"
                weight={6}
                opacity={0.8}
              />
              <Polyline
                positions={[
                  [liveData.startLat, liveData.startLng],
                  [liveData.destinationLat, liveData.destinationLng]
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
              color={liveData.travelMode === 'BUS' ? '#f97316' : '#2563eb'}
              weight={5}
              opacity={0.6}
              dashArray={liveData.travelMode === 'BUS' ? '5, 5' : null}
            />
          ) : (
            liveData && (
              <Polyline
                positions={[
                  [liveData.startLat, liveData.startLng],
                  [liveData.destinationLat, liveData.destinationLng]
                ]}
                color={liveData.travelMode === 'BUS' ? '#f97316' : '#2563eb'}
                weight={3}
                dashArray="5, 10"
                opacity={0.5}
              />
            )
          )}

          {/* Route path polyline */}
          {historyCoords.length > 0 && (
            <Polyline positions={historyCoords} color="#10b981" weight={5} opacity={0.9} />
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default LiveTracking;
