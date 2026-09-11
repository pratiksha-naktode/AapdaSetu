import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserRole } from './types';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { CitizenDashboard } from './pages/Citizen/CitizenDashboard';
import { CitizenProfile } from './pages/Citizen/CitizenProfile';
import { CreateEmergencyRequest } from './pages/Citizen/CreateEmergencyRequest';
import { ReportEmergencyRescue } from './pages/Citizen/ReportEmergencyRescue';
import { CreateResourceRequest } from './pages/Citizen/CreateResourceRequest';
import { RequestTracking } from './pages/Citizen/RequestTracking';
import { ResponderDashboard } from './pages/Responder/ResponderDashboard';
import { VolunteerDashboard } from './pages/Volunteer/VolunteerDashboard';
import { AdminDashboard } from './pages/Admin/AdminDashboard';
import { GISMap } from './pages/Admin/GISMap';
import { DamageAssessment } from './pages/Phase2/DamageAssessment';
import { DisasterRouting } from './pages/Phase3/DisasterRouting';
import { LoginPage } from './pages/Auth/LoginPage';
import { RoleLoginPage } from './pages/Auth/RoleLoginPage';
import { RegisterCitizen } from './pages/Auth/RegisterCitizen';
import { RegisterVolunteer } from './pages/Auth/RegisterVolunteer';
import { RegisterResponder } from './pages/Auth/RegisterResponder';

export const App: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<UserRole>('ADMIN');
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);

  const toggleOfflineSimulation = () => {
    setIsSimulatedOffline(prev => !prev);
  };

  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-container">
          <Navbar
            currentRole={currentRole}
            onRoleChange={setCurrentRole}
            isSimulatedOffline={isSimulatedOffline}
            onToggleOffline={toggleOfflineSimulation}
          />

          <main className="main-content">
            <Routes>
              {/* Public Overview & General Login Screen */}
              <Route path="/" element={<LandingPage onSelectRole={setCurrentRole} />} />
              <Route path="/login" element={<LoginPage />} />

              {/* Dedicated Role-Specific Login Routes */}
              <Route
                path="/citizen/login"
                element={
                  <RoleLoginPage
                    role="CITIZEN"
                    title="Login as Citizen"
                    subtitle="Access citizen emergency services, alerts, and tracking"
                    targetPortal="/citizen"
                    registerLink="/citizen/register"
                    registerText="Register as Citizen"
                  />
                }
              />
              <Route
                path="/responder/login"
                element={
                  <RoleLoginPage
                    role="RESPONDER"
                    title="Responder Login"
                    subtitle="Authorized NDRF, Police, Medical & Fire rescue units"
                    targetPortal="/responder"
                    registerLink="/responder/register"
                    registerText="Register Responder Unit"
                  />
                }
              />
              <Route
                path="/volunteer/login"
                element={
                  <RoleLoginPage
                    role="VOLUNTEER"
                    title="Volunteer Login"
                    subtitle="Access volunteer relief tasks and community assistance portal"
                    targetPortal="/volunteer"
                    registerLink="/volunteer/register"
                    registerText="Register as Community Volunteer"
                  />
                }
              />
              <Route
                path="/admin/login"
                element={
                  <RoleLoginPage
                    role="ADMIN"
                    title="Admin Login"
                    subtitle="Disaster Command Center authorized management portal"
                    targetPortal="/command-center"
                  />
                }
              />

              {/* Dedicated Role-Specific Registration Routes */}
              <Route path="/citizen/register" element={<RegisterCitizen />} />
              <Route path="/volunteer/register" element={<RegisterVolunteer />} />
              <Route path="/responder/register" element={<RegisterResponder />} />

              {/* Citizen Routes — Protected for CITIZEN and ADMIN */}
              <Route
                path="/citizen"
                element={
                  <ProtectedRoute allowedRoles={['CITIZEN', 'ADMIN']}>
                    <CitizenDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/citizen/profile"
                element={
                  <ProtectedRoute allowedRoles={['CITIZEN', 'ADMIN', 'RESPONDER', 'VOLUNTEER']}>
                    <CitizenProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/citizen/emergency"
                element={
                  <ProtectedRoute allowedRoles={['CITIZEN', 'ADMIN']}>
                    <CreateEmergencyRequest isSimulatedOffline={isSimulatedOffline} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/citizen/quick-emergency"
                element={
                  <ProtectedRoute allowedRoles={['CITIZEN', 'ADMIN']}>
                    <CreateEmergencyRequest isSimulatedOffline={isSimulatedOffline} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/citizen/report-rescue"
                element={
                  <ProtectedRoute allowedRoles={['CITIZEN', 'ADMIN']}>
                    <ReportEmergencyRescue isSimulatedOffline={isSimulatedOffline} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/citizen/emergency-rescue"
                element={
                  <ProtectedRoute allowedRoles={['CITIZEN', 'ADMIN']}>
                    <ReportEmergencyRescue isSimulatedOffline={isSimulatedOffline} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/citizen/resource"
                element={
                  <ProtectedRoute allowedRoles={['CITIZEN', 'ADMIN']}>
                    <CreateResourceRequest isSimulatedOffline={isSimulatedOffline} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/citizen/track/:id"
                element={
                  <ProtectedRoute allowedRoles={['CITIZEN', 'ADMIN', 'RESPONDER', 'VOLUNTEER']}>
                    <RequestTracking />
                  </ProtectedRoute>
                }
              />

              {/* Responder Routes — Protected for RESPONDER and ADMIN */}
              <Route
                path="/responder"
                element={
                  <ProtectedRoute allowedRoles={['RESPONDER', 'ADMIN']}>
                    <ResponderDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Volunteer Routes — Protected for VOLUNTEER and ADMIN */}
              <Route
                path="/volunteer"
                element={
                  <ProtectedRoute allowedRoles={['VOLUNTEER', 'ADMIN']}>
                    <VolunteerDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Admin Disaster Command Center Routes — Protected for ADMIN only */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/command-center"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/gis"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RESPONDER']}>
                    <GISMap />
                  </ProtectedRoute>
                }
              />

              {/* Phase 2 & 3 Specification Routes */}
              <Route path="/phase2-damage" element={<DamageAssessment />} />
              <Route path="/phase3-routing" element={<DisasterRouting />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
