import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Compass, Clock, MapPin, Gauge, ExternalLink, Calendar, Search } from 'lucide-react';

const History = () => {
  const { token, API_URL } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`${API_URL}/api/journeys/history`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setHistory(data);
        }
      } catch (err) {
        console.error('Error fetching history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [token]);

  const getDuration = (start, end) => {
    if (!end) return 'Active';
    const diffMs = new Date(end) - new Date(start);
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const filteredHistory = history.filter((j) => {
    const matchesSearch = j.journeyName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || j.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Journey History</h1>
          <p className="text-slate-400 mt-1">Review all your logged journey routes and stats</p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Search bar */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search journey name..."
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-white/5 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary text-sm"
            />
          </div>

          {/* Status Select Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-slate-300 text-sm focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {filteredHistory.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredHistory.map((j) => (
            <div key={j.id} className="glass-panel p-6 rounded-2xl flex flex-col justify-between hover:border-white/10 transition-colors">
              <div>
                <div className="flex justify-between items-start mb-4">
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
                  <span className="flex items-center gap-1 text-slate-400 text-xs">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(j.startTime).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-6 truncate">{j.journeyName}</h3>

                {/* Quick stats grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase">Duration</p>
                      <p className="text-sm font-semibold">{getDuration(j.startTime, j.endTime)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-accent" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase">Start Point</p>
                      <p className="text-sm font-semibold truncate max-w-[120px]" title={`${j.startLat.toFixed(4)}, ${j.startLng.toFixed(4)}`}>
                        {j.startLat.toFixed(3)}, {j.startLng.toFixed(3)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-white/5 pt-4 flex items-center justify-between">
                {j.status === 'ACTIVE' ? (
                  <Link
                    to={`/journey/active/${j.trackingCode}`}
                    className="w-full flex items-center justify-center gap-1.5 bg-accent hover:bg-accent-dark text-white font-bold py-2 rounded-xl text-xs transition-colors"
                  >
                    <Compass className="h-4 w-4" />
                    Track Real-Time
                  </Link>
                ) : (
                  <Link
                    to={`/analytics/${j.id}`}
                    className="w-full flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-750 text-white font-semibold py-2 rounded-xl text-xs border border-white/5 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Detailed Analytics
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel p-12 text-center rounded-2xl text-slate-400">
          <Search className="h-12 w-12 mx-auto mb-4 text-slate-600" />
          <p className="font-semibold text-lg text-slate-300">No matching journeys found</p>
          <p className="text-sm mt-1">Try modifying your search or filter settings.</p>
        </div>
      )}
    </div>
  );
};

export default History;
