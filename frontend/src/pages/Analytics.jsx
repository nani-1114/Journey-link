import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import {
  Play,
  Pause,
  Download,
  ArrowLeft,
  Compass,
  MapPin,
  Gauge,
  Clock,
  RotateCcw,
  Sliders,
  Calendar
} from 'lucide-react';

const MapController = ({ startCoords, destCoords }) => {
  const map = useMap();
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

const Analytics = () => {
  const { id } = useParams();
  const { token, API_URL } = useAuth();
  const navigate = useNavigate();

  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Replay animation states
  const [isPlaying, setIsPlaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 2x, 5x, 10x
  const replayInterval = useRef(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch(`${API_URL}/api/journeys/${id}/analytics`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setAnalyticsData(data);
        } else {
          setError('Failed to load analytics details');
        }
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Connection error');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [id, token]);

  // Route Replay animation loop
  useEffect(() => {
    if (isPlaying && analyticsData?.history) {
      const delay = 1000 / playbackSpeed;
      replayInterval.current = setInterval(() => {
        setReplayIndex((prev) => {
          if (prev >= analyticsData.history.length - 1) {
            setIsPlaying(false);
            clearInterval(replayInterval.current);
            return prev;
          }
          return prev + 1;
        });
      }, delay);
    } else {
      if (replayInterval.current) {
        clearInterval(replayInterval.current);
      }
    }

    return () => {
      if (replayInterval.current) {
        clearInterval(replayInterval.current);
      }
    };
  }, [isPlaying, playbackSpeed, analyticsData]);

  const handlePlayPause = () => {
    if (analyticsData?.history) {
      if (replayIndex >= analyticsData.history.length - 1) {
        setReplayIndex(0);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleResetReplay = () => {
    setIsPlaying(false);
    setReplayIndex(0);
  };

  const handleDownloadReport = () => {
    if (!analyticsData?.history || analyticsData.history.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Timestamp,Latitude,Longitude,Speed (km/h)\n";
    
    analyticsData.history.forEach((log) => {
      const time = new Date(log.timestamp).toISOString();
      csvContent += `"${time}",${log.latitude},${log.longitude},${log.speed}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `journey_report_${analyticsData.journeyName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDuration = (start, end) => {
    if (!end) return 'Active';
    const diffMs = new Date(end) - new Date(start);
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !analyticsData) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center p-6 glass-panel rounded-2xl">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-red-400">Error</h3>
        <p className="text-slate-300 mt-2">{error || 'Data missing'}</p>
        <button onClick={() => navigate('/history')} className="mt-6 px-4 py-2 bg-primary rounded-xl text-sm font-semibold">
          Back to History
        </button>
      </div>
    );
  }

  const logs = analyticsData.history || [];
  const startCoords = { lat: analyticsData.startLat, lng: analyticsData.startLng };
  const destCoords = { lat: analyticsData.destinationLat, lng: analyticsData.destinationLng };
  const pathCoords = logs.map(l => [l.latitude, l.longitude]);
  
  // Replay coordinates
  const currentReplayLog = logs[replayIndex] || logs[0] || startCoords;

  // Recharts chart data mapping
  const chartData = logs.map((log, idx) => ({
    name: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    speed: Math.round(log.speed * 10.0) / 10.0
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link to="/history" className="bg-slate-800 hover:bg-slate-750 p-2.5 rounded-xl border border-white/5 text-slate-300 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">{analyticsData.journeyName}</h1>
            <p className="text-slate-400 mt-1 flex items-center gap-1.5 text-sm">
              <Calendar className="h-4 w-4" />
              Logged on {new Date(logs[0]?.timestamp || Date.now()).toLocaleDateString()}
            </p>
          </div>
        </div>
        <button
          onClick={handleDownloadReport}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 text-sm"
        >
          <Download className="h-4 w-4" />
          Download CSV Report
        </button>
      </div>

      {/* Analytics stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase">Total Distance</span>
            <h3 className="text-2xl font-bold mt-1">{analyticsData.totalDistance} km</h3>
          </div>
          <div className="bg-slate-800 p-3 rounded-xl text-yellow-500">
            <MapPin className="h-5 w-5" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase">Average Speed</span>
            <h3 className="text-2xl font-bold mt-1">{analyticsData.avgSpeed} km/h</h3>
          </div>
          <div className="bg-slate-800 p-3 rounded-xl text-primary-light">
            <Gauge className="h-5 w-5" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase">Maximum Speed</span>
            <h3 className="text-2xl font-bold mt-1">{analyticsData.maxSpeed} km/h</h3>
          </div>
          <div className="bg-slate-800 p-3 rounded-xl text-red-500">
            <Gauge className="h-5 w-5" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase">Duration</span>
            <h3 className="text-2xl font-bold mt-1">
              {logs.length > 0 ? getDuration(logs[0].timestamp, logs[logs.length - 1].timestamp) : '---'}
            </h3>
          </div>
          <div className="bg-slate-800 p-3 rounded-xl text-indigo-400">
            <Clock className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Grid: Map + Replay controls (Left) & Speed Chart (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Map & Replay */}
        <div className="flex flex-col gap-4">
          <div className="glass-panel rounded-2xl overflow-hidden shadow-xl h-[400px] relative z-10">
            <MapContainer
              center={[startCoords.lat, startCoords.lng]}
              zoom={13}
              scrollWheelZoom={true}
              className="h-full w-full dark-map"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapController startCoords={startCoords} destCoords={destCoords} />

              {/* Start marker */}
              <Marker
                position={[startCoords.lat, startCoords.lng]}
                icon={L.icon({
                  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                  iconSize: [25, 41],
                  iconAnchor: [12, 41],
                })}
              />

              {/* End/Destination marker */}
              <Marker
                position={[destCoords.lat, destCoords.lng]}
                icon={L.icon({
                  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                  iconSize: [25, 41],
                  iconAnchor: [12, 41],
                })}
              />

              {/* Animated Replay Marker */}
              {logs.length > 0 && (
                <Marker
                  position={[currentReplayLog.latitude, currentReplayLog.longitude]}
                  icon={L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                  })}
                />
              )}

              {/* Historical Path line */}
              {pathCoords.length > 0 && (
                <Polyline positions={pathCoords} color="#3b82f6" weight={4} opacity={0.7} />
              )}
            </MapContainer>
          </div>

          {/* Replay Controls Panel */}
          <div className="glass-panel p-5 rounded-2xl shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-bold text-sm">Route Replay Player</span>
              {logs.length > 0 && (
                <span className="text-xs text-slate-400">
                  Step: {replayIndex + 1} / {logs.length} | Speed: {currentReplayLog.speed.toFixed(1)} km/h
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              {/* Play / Pause button */}
              <button
                onClick={handlePlayPause}
                disabled={logs.length === 0}
                className="p-3 bg-primary hover:bg-primary-dark text-white rounded-xl shadow-lg transition-colors disabled:opacity-50"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-white" />}
              </button>

              {/* Reset button */}
              <button
                onClick={handleResetReplay}
                disabled={logs.length === 0}
                className="p-3 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl border border-white/5 transition-colors disabled:opacity-50"
                title="Reset Replay"
              >
                <RotateCcw className="h-5 w-5" />
              </button>

              {/* Playback speed selector */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-white/5">
                {[1, 2, 5, 10].map((s) => (
                  <button
                    key={s}
                    onClick={() => setPlaybackSpeed(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      playbackSpeed === s
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Progress timeline slider */}
            {logs.length > 0 && (
              <input
                type="range"
                min="0"
                max={logs.length - 1}
                value={replayIndex}
                onChange={(e) => setReplayIndex(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            )}
          </div>
        </div>

        {/* Speed Chart Profile */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between shadow-xl min-h-[450px]">
          <div>
            <h3 className="font-bold text-lg text-white mb-2">Speed Profile</h3>
            <p className="text-xs text-slate-400 mb-6">Interactive velocity chart mapped along journey telemetry log pings</p>
          </div>

          {chartData.length > 0 ? (
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: 'rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '12px'
                    }}
                  />
                  <Area type="monotone" dataKey="speed" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorSpeed)" name="Speed (km/h)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-500 text-sm">
              Insufficient logs to plot speed profile.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
