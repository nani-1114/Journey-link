import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navigation, LogOut, History, User, LayoutDashboard, Menu, X } from 'lucide-react';

const NavBar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const linkClass = (path) =>
    `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
      isActive(path)
        ? 'bg-primary text-white shadow-lg shadow-primary/30'
        : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
    }`;

  const mobileLinkClass = (path) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
      isActive(path)
        ? 'bg-primary text-white'
        : 'text-slate-300 hover:text-white hover:bg-slate-800'
    }`;

  return (
    <nav className="sticky top-0 z-[1000] w-full border-b border-white/5 bg-slate-950/75 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-primary p-2 rounded-lg text-white group-hover:rotate-12 transition-transform duration-300">
              <Navigation className="h-5 w-5 fill-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-primary-light bg-clip-text text-transparent">
              JourneyLink
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <Link to="/dashboard" className={linkClass('/dashboard')}>
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                <Link to="/history" className={linkClass('/history')}>
                  <History className="h-4 w-4" />
                  History
                </Link>
                <div className="h-6 w-px bg-white/10 mx-2" />
                <div className="flex items-center gap-2 text-slate-300 text-sm font-medium bg-slate-800/30 px-3 py-1.5 rounded-lg border border-white/5">
                  <User className="h-4 w-4 text-primary-light" />
                  <span>{user.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 ml-2 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-950/20 rounded-lg text-sm font-medium transition-all duration-300"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-slate-300 hover:text-white px-4 py-2 text-sm font-medium transition-all duration-200"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-primary hover:bg-primary-dark text-white shadow-md shadow-primary/20 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-400 hover:text-white p-2 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-white/5 bg-slate-950 px-2 py-4 space-y-1">
          {user ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={mobileLinkClass('/dashboard')}
              >
                <LayoutDashboard className="h-5 w-5" />
                Dashboard
              </Link>
              <Link
                to="/history"
                onClick={() => setMobileMenuOpen(false)}
                className={mobileLinkClass('/history')}
              >
                <History className="h-5 w-5" />
                History
              </Link>
              <div className="border-t border-white/5 my-2 pt-2" />
              <div className="px-4 py-2 flex items-center gap-3 text-slate-300">
                <User className="h-5 w-5 text-primary" />
                <span className="font-medium">{user.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-950/20 text-base font-medium transition-colors"
              >
                <LogOut className="h-5 w-5" />
                Logout
              </button>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2 px-4 py-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex justify-center items-center px-4 py-2.5 rounded-lg border border-slate-700 text-slate-300 font-medium hover:bg-slate-800 text-center"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex justify-center items-center px-4 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark text-center"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default NavBar;
