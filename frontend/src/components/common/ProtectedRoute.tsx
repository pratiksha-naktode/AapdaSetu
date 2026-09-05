import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, token, isAuthenticated } = useAuth();
  const location = useLocation();

  // 1. Unauthenticated check: Redirect to unified /login
  if (!isAuthenticated || !token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Role-based authorization check: Show explicit Access Denied screen
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    console.warn(`[Access Denied] User role ${user.role} is not authorized for ${location.pathname}. Allowed: ${allowedRoles.join(', ')}`);
    
    const getDashboardPath = (role: UserRole) => {
      switch (role) {
        case 'RESPONDER':
          return '/responder';
        case 'VOLUNTEER':
          return '/volunteer';
        case 'ADMIN':
          return '/command-center';
        case 'CITIZEN':
        default:
          return '/citizen';
      }
    };

    const dashboardPath = getDashboardPath(user.role);

    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 bg-slate-900">
        <div className="max-w-md w-full bg-slate-800 border border-red-500/30 rounded-2xl p-8 text-center shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-sm text-slate-400">
              Your account (<span className="text-slate-200 font-semibold">{user.role}</span>) does not have permission to view this page.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => window.location.href = dashboardPath}
              className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
