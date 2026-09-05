import React, { useState } from 'react';
import { Navigation, AlertTriangle, ShieldCheck, MapPin, CheckCircle, Info } from 'lucide-react';

export const DisasterRouting: React.FC = () => {
  const [avoidFloodedRoads, setAvoidFloodedRoads] = useState<boolean>(true);
  const [avoidWeakBridges, setAvoidWeakBridges] = useState<boolean>(true);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Banner */}
      <div style={{ background: 'linear-gradient(135deg, #3b0764, #0f172a)', border: '1px solid #a855f7', padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(168, 85, 247, 0.2)', color: '#d8b4fe', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          <Navigation size={14} /> PHASE 3 ARCHITECTURE SPECIFICATION
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f3e8ff' }}>
          Disaster-Aware Dynamic Routing Architecture
        </h1>
        <p style={{ color: '#e9d5ff', fontSize: '0.9rem', marginTop: '0.35rem', lineHeight: 1.5 }}>
          Traditional GPS navigators find the <em>shortest</em> path, which in a flood disaster frequently leads emergency vehicles straight into submerged underpasses and washed-out culverts. Varahi's Phase 3 architecture computes <strong>safest accessible routes</strong>.
        </p>
      </div>

      {/* Routing Comparison Card */}
      <div className="card" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>
          Conventional Routing vs. Disaster-Aware Graph Engine
        </h2>

        <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid #ef4444', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ color: '#fca5a5', fontWeight: 800, fontSize: '1rem', marginBottom: '0.5rem' }}>
              ❌ Standard Navigation (Shortest Route)
            </div>
            <ul style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '1.2rem', lineHeight: 1.6 }}>
              <li>Directs vehicles through Someswara Temple Lowland (3.8 km, 8 mins)</li>
              <li><strong>Critical Hazard:</strong> Yenamadurru drain breach has flooded the underpass with 4.5 ft of water</li>
              <li>Vehicle breakdown / rescue mission trapped</li>
            </ul>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid #10b981', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ color: '#86efac', fontWeight: 800, fontSize: '1rem', marginBottom: '0.5rem' }}>
              ✅ Varahi Safe Route (Disaster Weighted)
            </div>
            <ul style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '1.2rem', lineHeight: 1.6 }}>
              <li>Reroutes via Bhimavaram Bypass Elevated Flyover (5.4 km, 12 mins)</li>
              <li><strong>Safety Verified:</strong> Road elevation remains 2.5 meters above flood watermark</li>
              <li>Emergency relief delivery arrives safely without obstruction</li>
            </ul>
          </div>
        </div>

        {/* Integration Architecture Specs */}
        <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#38bdf8', fontWeight: 700, fontSize: '0.9rem' }}>
            <Info size={16} /> Technical Integration Stack (Target Implementation)
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <div>• <strong>Road Network Graph:</strong> OpenStreetMap (OSM) PBF extraction for West Godavari District</div>
            <div>• <strong>Routing Engine:</strong> OSRM (Open Source Routing Machine) or GraphHopper custom vehicle profiles</div>
            <div>• <strong>Dynamic Penalty Layer:</strong> PostGIS polygons of flooded zones and blocked roads apply infinite cost weight (avoiding impassable road segments)</div>
          </div>
        </div>
      </div>
    </div>
  );
};
