import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Navigation,
  Compass,
  MapPin,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Shield,
  Activity,
  Plus,
  X,
  Gauge
} from 'lucide-react';

// Fix Leaflet marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Map click handler helper component
const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
};

// Map controller to center view dynamically on search results
const DashboardMapController = ({ center, startCoords, destCoords }) => {
  const map = useMap();
  useEffect(() => {
    if (center && !destCoords) {
      map.setView(center, 12);
    }
  }, [center, map, destCoords]);

  // Fit bounds when both pins are set to show the entire route preview
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

const Dashboard = () => {
  const { token, API_URL } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  // Form states
  const [journeyName, setJourneyName] = useState('');
  const [startCoords, setStartCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [placingType, setPlacingType] = useState('start'); // 'start' or 'destination'
  const [startSearchQuery, setStartSearchQuery] = useState('');
  const [destSearchQuery, setDestSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [travelMode, setTravelMode] = useState('DRIVING');
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [useExpiry, setUseExpiry] = useState(false);
  const [expiryMinutes, setExpiryMinutes] = useState(30);
  const [createLoading, setCreateLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch Dashboard statistics
  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/journeys/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  // Lookup place name coordinates via Nominatim OpenStreetMap API
  const handleSearchLocation = async (query, type) => {
    if (!query) return;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'JourneyLinkApp/1.0'
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const coords = {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
          };
          if (type === 'start') {
            setStartCoords(coords);
            setMapCenter([coords.lat, coords.lng]);
            setPlacingType('destination'); // Auto focus destination placement next!
          } else {
            setDestCoords(coords);
            setMapCenter([coords.lat, coords.lng]);
          }
          setFormError('');
        } else {
          setFormError(`Place name "${query}" not found. Please try a different name or set on map.`);
        }
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      setFormError('Failed to lookup place name. Please try manual map selection.');
    }
  };

  // Fetch real road route from OSRM when start and destination coordinates are available
  useEffect(() => {
    const fetchRoute = async () => {
      if (!startCoords || !destCoords) {
        setRouteCoordinates([]);
        return;
      }
      if (travelMode === 'TRAIN') {
        setRouteCoordinates([]); // Use straight-line rail visual fallback
        return;
      }
      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${startCoords.lng},${startCoords.lat};${destCoords.lng},${destCoords.lat}?overview=full&geometries=geojson`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.routes && data.routes.length > 0) {
            const coords = data.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]); // Swap [lng, lat] to [lat, lng]
            setRouteCoordinates(coords);
          }
        }
      } catch (err) {
        console.error('Error fetching route from OSRM:', err);
        setRouteCoordinates([]); // Fallback to straight line handled in render
      }
    };
    fetchRoute();
  }, [startCoords, destCoords, travelMode]);

  // Detect current GPS coordinates
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setFormError('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStartCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setFormError('');
      },
      (err) => {
        console.error('Location detection error:', err);
        setFormError('Failed to detect GPS location. Please check browser permissions.');
      },
      { enableHighAccuracy: true }
    );
  };

  const handleStartJourney = async (e) => {
    e.preventDefault();
    if (!journeyName) {
      setFormError('Please enter a journey name');
      return;
    }
    if (!startCoords) {
      setFormError('Please select or search your starting coordinates');
      return;
    }
    if (!destCoords) {
      setFormError('Please select or search your destination coordinates');
      return;
    }

    setCreateLoading(true);
    setFormError('');

    const payload = {
      journeyName,
      startLat: startCoords.lat,
      startLng: startCoords.lng,
      destinationLat: destCoords.lat,
      destinationLng: destCoords.lng,
      password: usePassword ? password : null,
      expiresInMinutes: useExpiry ? expiryMinutes : null,
      startAddress: startSearchQuery || `Lat: ${startCoords.lat.toFixed(4)}, Lng: ${startCoords.lng.toFixed(4)}`,
      destinationAddress: destSearchQuery || `Lat: ${destCoords.lat.toFixed(4)}, Lng: ${destCoords.lng.toFixed(4)}`,
      travelMode,
    };

    try {
      const response = await fetch(`${API_URL}/api/journeys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setShowCreateModal(false);
        // Redirect to active journey page
        navigate(`/journey/active/${data.trackingCode}`);
      } else {
        setFormError(data.message || 'Failed to create journey. Try again.');
      }
    } catch (err) {
      console.error('Create journey error:', err);
      setFormError('Connection error. Please try again.');
    } finally {
      setCreateLoading(false);
    }
  };

  const copyToClipboard = (code) => {
    const baseOrigin = import.meta.env.VITE_SHARE_URL || window.location.origin;
    const shareUrl = `${baseOrigin}/live/${code}`;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(shareUrl)
        .then(() => setCopiedCode(code))
        .catch(err => console.error('Clipboard copy failed:', err));
    } else {
      // Fallback for insecure HTTP connections
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedCode(code);
      } catch (err) {
        console.error('Fallback copy failed:', err);
      }
      document.body.removeChild(textArea);
    }
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Overview</h1>
          <p className="text-slate-400 mt-1">Real-time stats and active journey logs</p>
        </div>
        <button
          onClick={() => {
            setShowCreateModal(true);
            setJourneyName('');
            setStartCoords(null);
            setDestCoords(null);
            setPlacingType('start');
            setStartSearchQuery('');
            setDestSearchQuery('');
            setMapCenter(null);
            setRouteCoordinates([]);
            setTravelMode('DRIVING');
            setUsePassword(false);
            setPassword('');
            setUseExpiry(false);
            setFormError('');
          }}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold px-5 py-3 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300"
        >
          <Plus className="h-5 w-5" />
          Start New Journey
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Total Journeys */}
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Total Journeys</span>
            <h3 className="text-3xl font-bold mt-2">{stats?.totalJourneys || 0}</h3>
          </div>
          <div className="bg-slate-800 p-3.5 rounded-xl text-primary">
            <Compass className="h-6 w-6" />
          </div>
        </div>

        {/* Active Journeys */}
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between border-accent/20">
          <div>
            <span className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Active Journeys</span>
            <h3 className="text-3xl font-bold mt-2 text-accent-light">{stats?.activeJourneys || 0}</h3>
          </div>
          <div className="bg-emerald-950/40 p-3.5 rounded-xl text-accent">
            <Activity className="h-6 w-6 animate-pulse" />
          </div>
        </div>

        {/* Distance Travelled */}
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Total Distance</span>
            <h3 className="text-3xl font-bold mt-2">{stats?.totalDistanceTravelled || 0} km</h3>
          </div>
          <div className="bg-slate-800 p-3.5 rounded-xl text-yellow-500">
            <MapPin className="h-6 w-6" />
          </div>
        </div>

        {/* Average Speed */}
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Avg Speed</span>
            <h3 className="text-3xl font-bold mt-2">{stats?.avgSpeed || 0} km/h</h3>
          </div>
          <div className="bg-slate-800 p-3.5 rounded-xl text-indigo-400">
            <Gauge className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Recent Journeys Table */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-5 border-b border-white/5 bg-slate-900/40">
          <h3 className="font-bold text-lg">Recent Journeys</h3>
        </div>

        {stats?.recentJourneys && stats.recentJourneys.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-slate-950/20 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Journey Name</th>
                  <th className="px-6 py-4">Date Started</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Link Security</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {stats.recentJourneys.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4 font-semibold text-white">{j.journeyName}</td>
                    <td className="px-6 py-4 text-slate-300">
                      {new Date(j.startTime).toLocaleDateString()} at {new Date(j.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          j.status === 'ACTIVE'
                            ? 'bg-emerald-950/50 text-accent border border-accent/20'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${j.status === 'ACTIVE' ? 'bg-accent animate-ping' : 'bg-slate-400'}`}></span>
                        {j.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {j.passwordProtected ? (
                        <span className="flex items-center gap-1 text-xs text-yellow-500 font-medium">
                          <Shield className="h-3.5 w-3.5" />
                          Password Protected
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Public Link</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      {/* Copy Share Link */}
                      <button
                        onClick={() => copyToClipboard(j.trackingCode)}
                        title="Copy Share Link"
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                      >
                        {copiedCode === j.trackingCode ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
                      </button>

                      {/* Open Active/Analytics Route */}
                      {j.status === 'ACTIVE' ? (
                        <Link
                          to={`/journey/active/${j.trackingCode}`}
                          className="flex items-center gap-1 text-accent-light hover:underline font-medium text-xs bg-emerald-950/30 border border-emerald-500/20 px-3 py-1.5 rounded-lg"
                        >
                          <Navigation className="h-3 w-3 fill-accent" />
                          Track Live
                        </Link>
                      ) : (
                        <Link
                          to={`/analytics/${j.id}`}
                          className="flex items-center gap-1 text-primary-light hover:underline font-medium text-xs bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Analytics
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400">
            <Compass className="h-12 w-12 mx-auto mb-4 text-slate-600" />
            <p className="font-semibold text-lg text-slate-300">No journeys logged yet</p>
            <p className="text-sm mt-1">Start a journey to test tracking features!</p>
          </div>
        )}
      </div>

      {/* Start Journey Dialog Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[2000] flex justify-center items-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
            {/* Form Section */}
            <form onSubmit={handleStartJourney} className="md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-bold">Configure Journey</h3>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {formError && (
                  <div className="bg-red-950/40 border border-red-500/30 text-red-300 px-3 py-2 rounded-lg text-xs">
                    {formError}
                  </div>
                )}

                {/* Journey Name */}
                <div>
                  <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                    Journey Name
                  </label>
                  <input
                    type="text"
                    required
                    value={journeyName}
                    onChange={(e) => setJourneyName(e.target.value)}
                    placeholder="Commute to office, Weekend Roadtrip, etc."
                    className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors text-sm"
                  />
                </div>

                {/* Travel Mode Selector */}
                <div>
                  <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                    Travel Mode
                  </label>
                  <select
                    value={travelMode}
                    onChange={(e) => setTravelMode(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary transition-colors text-sm"
                  >
                    <option value="DRIVING">🚗 Driving (Car/Road)</option>
                    <option value="TRAIN">🚆 Train (Rail)</option>
                    <option value="BUS">🚌 Bus (Transit)</option>
                  </select>
                </div>

                {/* Start Coordinates */}
                <div className={`p-3 rounded-xl transition-all ${placingType === 'start' ? 'ring-2 ring-primary bg-primary/5' : 'bg-slate-950/20'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
                      Start Location
                    </label>
                    {placingType === 'start' && (
                      <span className="text-[10px] text-primary-light font-bold bg-primary/20 px-2 py-0.5 rounded-full">Placing...</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleDetectLocation}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-white rounded-lg border border-white/5 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        Detect GPS
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlacingType('start')}
                        className={`flex-1 py-2 rounded-lg font-semibold text-xs transition-colors ${placingType === 'start' ? 'bg-primary text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-white/5'}`}
                      >
                        Set on Map
                      </button>
                    </div>
                    
                    {/* Search Start Place Input */}
                    <div className="flex gap-1.5 mt-1">
                      <input
                        type="text"
                        placeholder="Search start place name..."
                        value={startSearchQuery}
                        onChange={(e) => setStartSearchQuery(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-slate-950 border border-white/10 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:border-primary"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSearchLocation(startSearchQuery, 'start');
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleSearchLocation(startSearchQuery, 'start')}
                        className="px-3 bg-slate-800 hover:bg-slate-750 border border-white/5 rounded-lg text-white font-semibold text-xs transition-colors"
                      >
                        Search
                      </button>
                    </div>

                    {startCoords ? (
                      <div className="w-full py-2 bg-slate-950/80 border border-emerald-500/20 text-accent-light rounded-lg text-xs text-center truncate font-mono">
                        {startCoords.lat.toFixed(5)}, {startCoords.lng.toFixed(5)}
                      </div>
                    ) : (
                      <div className="w-full py-2 bg-slate-950/40 text-slate-500 rounded-lg text-xs text-center border border-dashed border-white/5">
                        No start point selected
                      </div>
                    )}
                  </div>
                </div>

                {/* Destination Position */}
                <div className={`p-3 rounded-xl transition-all ${placingType === 'destination' ? 'ring-2 ring-red-500 bg-red-500/5' : 'bg-slate-950/20'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
                      Destination Position
                    </label>
                    {placingType === 'destination' && (
                      <span className="text-[10px] text-red-400 font-bold bg-red-950/40 px-2 py-0.5 rounded-full">Placing...</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setPlacingType('destination')}
                      className={`w-full py-2 rounded-lg font-semibold text-xs transition-colors ${placingType === 'destination' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-white/5'}`}
                    >
                      Set on Map
                    </button>
                    
                    {/* Search Destination Place Input */}
                    <div className="flex gap-1.5 mt-1">
                      <input
                        type="text"
                        placeholder="Search destination name..."
                        value={destSearchQuery}
                        onChange={(e) => setDestSearchQuery(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-slate-950 border border-white/10 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:border-red-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSearchLocation(destSearchQuery, 'destination');
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleSearchLocation(destSearchQuery, 'destination')}
                        className="px-3 bg-slate-800 hover:bg-slate-750 border border-white/5 rounded-lg text-white font-semibold text-xs transition-colors"
                      >
                        Search
                      </button>
                    </div>

                    {destCoords ? (
                      <div className="w-full py-2 bg-slate-950/80 border border-emerald-500/20 text-accent-light rounded-lg text-xs text-center truncate font-mono">
                        {destCoords.lat.toFixed(5)}, {destCoords.lng.toFixed(5)}
                      </div>
                    ) : (
                      <div className="w-full py-2 bg-slate-950/40 text-slate-500 rounded-lg text-xs text-center border border-dashed border-white/5">
                        No destination selected
                      </div>
                    )}
                  </div>
                </div>

                {/* Password Protection Option */}
                <div className="border-t border-white/5 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={usePassword}
                      onChange={(e) => setUsePassword(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-primary focus:ring-primary focus:ring-offset-slate-900"
                    />
                    <span className="text-slate-300 text-sm font-medium">Password Protected Share Link</span>
                  </label>
                  {usePassword && (
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter link password"
                      className="w-full px-4 py-2 bg-slate-950 border border-white/10 rounded-lg text-white mt-2 placeholder-slate-500 focus:outline-none focus:border-primary text-sm"
                    />
                  )}
                </div>

                {/* Link Expiration Option */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useExpiry}
                      onChange={(e) => setUseExpiry(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-primary focus:ring-primary focus:ring-offset-slate-900"
                    />
                    <span className="text-slate-300 text-sm font-medium">Tracking Link Expiry</span>
                  </label>
                  {useExpiry && (
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="number"
                        required
                        min="1"
                        max="1440"
                        value={expiryMinutes}
                        onChange={(e) => setExpiryMinutes(parseInt(e.target.value))}
                        className="w-24 px-3 py-1.5 bg-slate-950 border border-white/10 rounded-lg text-white text-sm"
                      />
                      <span className="text-slate-400 text-sm">Minutes</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={createLoading}
                className="w-full mt-6 flex justify-center items-center gap-2 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {createLoading ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Navigation className="h-5 w-5 fill-white" />
                    Start Journey Now
                  </>
                )}
              </button>
            </form>

            {/* Interactive Map Section */}
            <div className="hidden md:block md:w-1/2 bg-slate-950 relative h-[500px]">
              <MapContainer
                center={[20.5937, 78.9629]} // Default centered on India, Leaflet resets center dynamically
                zoom={5}
                scrollWheelZoom={true}
                className="h-full w-full dark-map"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <DashboardMapController center={mapCenter} startCoords={startCoords} destCoords={destCoords} />
                <MapClickHandler
                  onMapClick={(latlng) => {
                    if (placingType === 'start') {
                      setStartCoords({ lat: latlng.lat, lng: latlng.lng });
                      setPlacingType('destination');
                    } else {
                      setDestCoords({ lat: latlng.lat, lng: latlng.lng });
                    }
                  }}
                />
                {/* Polyline Route Rendering */}
                {travelMode === 'TRAIN' ? (
                  // Draw railway tracks: a solid black line and a dashed white line on top!
                  startCoords && destCoords && (
                    <>
                      <Polyline positions={[[startCoords.lat, startCoords.lng], [destCoords.lat, destCoords.lng]]} color="#000000" weight={5} opacity={0.8} />
                      <Polyline positions={[[startCoords.lat, startCoords.lng], [destCoords.lat, destCoords.lng]]} color="#ffffff" weight={3} dashArray="8, 8" opacity={0.9} />
                    </>
                  )
                ) : routeCoordinates.length > 0 ? (
                  <Polyline 
                    positions={routeCoordinates} 
                    color={travelMode === 'BUS' ? '#f97316' : '#3b82f6'} 
                    weight={4} 
                    opacity={0.8} 
                    dashArray={travelMode === 'BUS' ? '5, 5' : null} 
                  />
                ) : (
                  startCoords && destCoords && (
                    <Polyline 
                      positions={[[startCoords.lat, startCoords.lng], [destCoords.lat, destCoords.lng]]} 
                      color={travelMode === 'BUS' ? '#f97316' : '#3b82f6'} 
                      weight={3} 
                      dashArray="5, 10" 
                      opacity={0.6} 
                    />
                  )
                )}
                {startCoords && (
                  <Marker
                    position={[startCoords.lat, startCoords.lng]}
                    icon={L.icon({
                      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                      iconSize: [25, 41],
                      iconAnchor: [12, 41],
                    })}
                  />
                )}
                {destCoords && (
                  <Marker
                    position={[destCoords.lat, destCoords.lng]}
                    icon={L.icon({
                      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                      iconSize: [25, 41],
                      iconAnchor: [12, 41],
                    })}
                  />
                )}
              </MapContainer>
              <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-xs z-[1000] pointer-events-none">
                {placingType === 'start' ? 'Click map to place START pin (Blue).' : 'Click map to place DESTINATION pin (Red).'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
