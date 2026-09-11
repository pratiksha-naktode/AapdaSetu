import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserRole } from '../../types';
import { ShieldAlert, Wifi, WifiOff, RefreshCw, Layers, Sparkles, Navigation, PlusCircle, List, User, LogIn, LogOut, CheckSquare } from 'lucide-react';
import { getPendingSyncRequests, syncOfflineQueue } from '../../services/offlineStorage';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  currentRole?: UserRole;
  onRoleChange?: (role: UserRole) => void;
  isSimulatedOffline: boolean;
  onToggleOffline: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isSimulatedOffline,
  onToggleOffline
}) => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Check pending offline requests count
  useEffect(() => {
    const updateCount = async () => {
      const items = await getPendingSyncRequests();
      setPendingCount(items.length);
    };
    updateCount();
    const interval = setInterval(updateCount, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await syncOfflineQueue();
      alert(`Sync completed: ${res.synced} request(s) uploaded to command center.`);
      const remaining = await getPendingSyncRequests();
      setPendingCount(remaining.length);
    } catch (e: any) {
      alert('Sync failed: ' + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const initials = (user?.full_name || 'User')
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const renderRoleNavLinks = () => {
    if (!isAuthenticated || !user) return null;

    switch (user.role) {
      case 'CITIZEN':
        return (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Link to="/citizen" className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.3rem' }}>
              Dashboard
            </Link>
            <Link to="/citizen/emergency" className="btn btn-critical" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.3rem', fontWeight: 800 }}>
              🚨 Report Emergency
            </Link>
            <Link to="/citizen" className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.3rem' }}>
              <List size={14} /> My Requests
            </Link>
          </div>
        );

      case 'RESPONDER':
        return (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Link to="/responder" className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.3rem' }}>
              Dashboard
            </Link>
            <Link to="/responder" className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.3rem' }}>
              <List size={14} /> Assigned Requests
            </Link>
            <Link to="/admin/gis" className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.3rem' }}>
              <Layers size={14} color="#38bdf8" /> GIS Map
            </Link>
          </div>
        );

      case 'VOLUNTEER':
        return (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Link to="/volunteer" className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.3rem' }}>
              Dashboard
            </Link>
            <Link to="/volunteer" className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.3rem' }}>
              <List size={14} /> Available Requests
            </Link>
            <Link to="/volunteer" className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.3rem' }}>
              <CheckSquare size={14} /> My Tasks
            </Link>
          </div>
        );

      case 'ADMIN':
        return (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Link to="/command-center" className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.3rem' }}>
              Command Center
            </Link>
            <Link to="/admin/gis" className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.3rem' }}>
              <Layers size={14} color="#38bdf8" /> GIS Map
            </Link>
            <Link to="/admin" className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.3rem' }}>
              Requests
            </Link>
            <Link to="/phase2-damage" className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.3rem' }}>
              <Sparkles size={14} color="#f59e0b" /> Phase 2
            </Link>
            <Link to="/phase3-routing" className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.3rem' }}>
              <Navigation size={14} color="#a855f7" /> Phase 3
            </Link>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <header className="navbar">
      <div className="nav-brand">
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#fff' }}>
          <ShieldAlert size={28} color="#ef4444" />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ letterSpacing: '0.04em', fontWeight: 900 }}>VARAHI</span>
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400 }}>
              AI-Powered Disaster Response Coordination
            </div>
          </div>
        </Link>
      </div>

      <div className="nav-controls">
        {/* Dynamic Role-Based Navigation Links */}
        {renderRoleNavLinks()}

        {/* Offline Toggle & Sync Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={onToggleOffline}
            className={`connectivity-badge ${isSimulatedOffline ? 'offline' : 'online'}`}
            title="Toggle offline / online connectivity mode"
          >
            {isSimulatedOffline ? <WifiOff size={14} /> : <Wifi size={14} />}
            <span>{isSimulatedOffline ? 'OFFLINE MODE' : 'ONLINE'}</span>
          </button>

          {pendingCount > 0 && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="btn btn-critical"
              style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem', gap: '0.3rem' }}
            >
              <RefreshCw size={12} className={isSyncing ? 'spin' : ''} />
              Sync ({pendingCount} pending)
            </button>
          )}
        </div>

        {/* User Profile / Auth Button - NO role-switcher buttons */}
        {isAuthenticated && user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Link
              to="/citizen/profile"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              title={`Logged in as ${user.full_name} (${user.email})`}
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #3b82f6',
                    boxShadow: '0 2px 6px rgba(59, 130, 246, 0.4)'
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3b82f6, #1e40af)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    border: '2px solid #60a5fa'
                  }}
                >
                  {initials}
                </div>
              )}
              <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 600, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.full_name || 'User'}
              </span>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 800,
                background: user.role === 'ADMIN' ? '#ef4444' : user.role === 'RESPONDER' ? '#0284c7' : user.role === 'VOLUNTEER' ? '#9333ea' : '#3b82f6',
                color: '#fff',
                padding: '0.1rem 0.35rem',
                borderRadius: '3px',
                textTransform: 'uppercase'
              }}>
                {user.role}
              </span>
            </Link>

            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="btn btn-outline"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', gap: '0.3rem' }}
              title="Sign Out"
            >
              <LogOut size={13} />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="btn btn-primary"
            style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', gap: '0.35rem' }}
          >
            <LogIn size={14} /> Sign In
          </Link>
        )}
      </div>
    </header>
  );
};
