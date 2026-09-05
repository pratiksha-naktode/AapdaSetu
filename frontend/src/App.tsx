import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserRole } from './types';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { LandingPage } from './pages/LandingPage';
import { CitizenDashboard } from './pages/Citizen/CitizenDashboard';
import { CitizenProfile } from './pages/Citizen/CitizenProfile';
import { CreateEmergencyRequest } from './pages/Citizen/CreateEmergencyRequest';
import { CreateResourceRequest } from './pages/Citizen/CreateResourceRequest';
import { RequestTracking } from './pages/Citizen/RequestTracking';
import { ResponderDashboard } from './pages/Responder/ResponderDashboard';
import { VolunteerDashboard } from './pages/Volunteer/VolunteerDashboard';
import { AdminDashboard } from './pages/Admin/AdminDashboard';
import { GISMap } from './pages/Admin/GISMap';
import { DamageAssessment } from './pages/Phase2/DamageAssessment';
import { DisasterRouting } from './pages/Phase3/DisasterRouting';

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
              <Route path="/" element={<LandingPage onSelectRole={setCurrentRole} />} />
              
              {/* Citizen Routes */}
              <Route path="/citizen" element={<CitizenDashboard />} />
              <Route path="/citizen/profile" element={<CitizenProfile />} />
              <Route path="/citizen/emergency" element={<CreateEmergencyRequest isSimulatedOffline={isSimulatedOffline} />} />
              <Route path="/citizen/resource" element={<CreateResourceRequest isSimulatedOffline={isSimulatedOffline} />} />
              <Route path="/citizen/track/:id" element={<RequestTracking />} />

              {/* Responder Routes */}
              <Route path="/responder" element={<ResponderDashboard />} />

              {/* Volunteer Routes */}
              <Route path="/volunteer" element={<VolunteerDashboard />} />

              {/* Admin Command Routes */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/gis" element={<GISMap />} />

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
