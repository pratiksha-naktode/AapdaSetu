import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../../services/api';
import { EmergencyRequest, Responder, Volunteer, Facility } from '../../types';
import { Layers, Shield, HeartHandshake, Home, Cross, Phone, AlertTriangle } from 'lucide-react';

export const GISMap: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [facilities, setFacilities] = useState<{ shelters: Facility[]; hospitals: Facility[]; policeStations: Facility[] }>({
    shelters: [],
    hospitals: [],
    policeStations: []
  });

  // Layer Visibility Toggles
  const [showCriticalOnly, setShowCriticalOnly] = useState<boolean>(false);
  const [showResponders, setShowResponders] = useState<boolean>(true);
  const [showVolunteers, setShowVolunteers] = useState<boolean>(true);
  const [showFacilities, setShowFacilities] = useState<boolean>(true);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Bhimavaram Flood Center: 16.5449° N, 81.5212° E
    const map = L.map(mapContainerRef.current).setView([16.5449, 81.5212], 14);

    // Dark high-contrast command tiles (CartoDB Dark Matter) with OSM fallback
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxZoom: 19
    }).addTo(map);

    // Flood Inundation Zone polygon for Bhimavaram lowlands
    const floodPolygon = L.polygon([
      [16.5360, 81.5150],
      [16.5530, 81.5140],
      [16.5560, 81.5300],
      [16.5380, 81.5350]
    ], {
      color: '#38bdf8',
      fillColor: '#0284c7',
      fillOpacity: 0.15,
      weight: 2,
      dashArray: '4, 4'
    }).addTo(map);
    floodPolygon.bindPopup('<strong>Flood Inundation Warning Zone</strong><br/>Yenamadurru Drain Flood Sector (Bhimavaram)');

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Fetch all GIS datasets
  const fetchData = async () => {
    try {
      const [reqList, respList, volList, facs] = await Promise.all([
        api.getRequests(),
        api.getResponders(),
        api.getVolunteers(),
        api.getFacilities()
      ]);
      setRequests(reqList);
      setResponders(respList);
      setVolunteers(volList);
      setFacilities(facs);
    } catch (err) {
      console.error('Error fetching GIS map data:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Re-render markers whenever data or filters change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    const layer = markersLayerRef.current;
    layer.clearLayers();

    // 1. Render Citizen Requests
    requests.forEach((req) => {
      if (showCriticalOnly && req.priority_level !== 'CRITICAL') return;

      const isCritical = req.priority_level === 'CRITICAL';
      const isHigh = req.priority_level === 'HIGH';
      const isMedium = req.priority_level === 'MEDIUM';

      let pinColor = '#10b981'; // LOW
      let pulseClass = 'pin-low';
      if (isCritical) { pinColor = '#ef4444'; pulseClass = 'pin-critical'; }
      else if (isHigh) { pinColor = '#f97316'; pulseClass = 'pin-high'; }
      else if (isMedium) { pinColor = '#eab308'; pulseClass = 'pin-medium'; }

      const iconHtml = `
        <div class="custom-pin ${pulseClass}" style="width: 28px; height: 28px; background: ${pinColor}; border: 2px solid #fff;">
          <span>${req.people_count}</span>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'leaflet-custom-div-icon',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const popupHtml = `
        <div style="min-width: 220px; font-family: sans-serif;">
          <div style="font-size: 11px; font-weight: 800; color: ${pinColor}; text-transform: uppercase;">
            ${req.priority_level} (${req.priority_score}/100) • ${req.request_type}
          </div>
          <div style="font-size: 14px; font-weight: 700; margin: 4px 0;">
            ${req.category.replace(/_/g, ' ').toUpperCase()}
          </div>
          <div style="font-size: 12px; color: #94a3b8;">
            ${req.address || 'Bhimavaram Area'}
          </div>
          <div style="font-size: 12px; margin: 6px 0; padding: 6px; background: rgba(0,0,0,0.2); border-radius: 4px;">
            <strong>Triage:</strong> ${req.priority_reason || 'Evaluating...'}
          </div>
          <div style="font-size: 11px; color: #cbd5e1; display: flex; justify-content: space-between;">
            <span>People: <strong>${req.people_count}</strong></span>
            <span>Status: <strong>${req.status}</strong></span>
          </div>
        </div>
      `;

      const marker = L.marker([req.latitude, req.longitude], { icon: customIcon });
      marker.bindPopup(popupHtml);
      layer.addLayer(marker);
    });

    // 2. Render Responders (Blue Pin)
    if (showResponders) {
      responders.forEach((resp) => {
        const iconHtml = `
          <div class="custom-pin pin-responder" style="width: 28px; height: 28px; background: #3b82f6; border: 2px solid #60a5fa;">
            <span>👮</span>
          </div>
        `;
        const icon = L.divIcon({ html: iconHtml, className: '', iconSize: [28, 28], iconAnchor: [14, 14] });
        const marker = L.marker([resp.latitude, resp.longitude], { icon });
        marker.bindPopup(`
          <div style="font-family: sans-serif;">
            <strong style="color: #60a5fa;">${resp.responder_type}</strong>
            <div style="font-weight: 700;">${resp.name}</div>
            <div style="font-size: 11px;">Badge: ${resp.badge_number}</div>
            <div style="font-size: 11px;">Phone: ${resp.phone}</div>
          </div>
        `);
        layer.addLayer(marker);
      });
    }

    // 3. Render Volunteers (Purple Pin)
    if (showVolunteers) {
      volunteers.forEach((vol) => {
        const iconHtml = `
          <div class="custom-pin pin-volunteer" style="width: 26px; height: 26px; background: #a855f7; border: 2px solid #c084fc;">
            <span>🤝</span>
          </div>
        `;
        const icon = L.divIcon({ html: iconHtml, className: '', iconSize: [26, 26], iconAnchor: [13, 13] });
        const marker = L.marker([vol.latitude, vol.longitude], { icon });
        marker.bindPopup(`
          <div style="font-family: sans-serif;">
            <strong style="color: #c084fc;">Relief Volunteer</strong>
            <div style="font-weight: 700;">${vol.name}</div>
            <div style="font-size: 11px;">Vehicle: ${vol.vehicle_type || 'N/A'}</div>
            <div style="font-size: 11px;">Capabilities: ${vol.capabilities.join(', ')}</div>
          </div>
        `);
        layer.addLayer(marker);
      });
    }

    // 4. Render Facilities (Shelters & Hospitals)
    if (showFacilities) {
      facilities.shelters.forEach((s) => {
        const iconHtml = `<div class="custom-pin" style="width: 24px; height: 24px; background: #14b8a6; border: 2px solid #fff;">⛺</div>`;
        const icon = L.divIcon({ html: iconHtml, className: '', iconSize: [24, 24], iconAnchor: [12, 12] });
        const marker = L.marker([s.latitude, s.longitude], { icon });
        marker.bindPopup(`<strong>Relief Shelter</strong><br/>${s.name}<br/>Capacity: ${s.capacity} (Occupancy: ${s.current_occupancy})`);
        layer.addLayer(marker);
      });

      facilities.hospitals.forEach((h) => {
        const iconHtml = `<div class="custom-pin" style="width: 24px; height: 24px; background: #ef4444; border: 2px solid #fff;">🏥</div>`;
        const icon = L.divIcon({ html: iconHtml, className: '', iconSize: [24, 24], iconAnchor: [12, 12] });
        const marker = L.marker([h.latitude, h.longitude], { icon });
        marker.bindPopup(`<strong>Emergency Hospital</strong><br/>${h.name}<br/>ICU Beds: ${h.icu_beds_available}<br/>Ambulances: ${h.ambulance_available}`);
        layer.addLayer(marker);
      });
    }
  }, [requests, responders, volunteers, facilities, showCriticalOnly, showResponders, showVolunteers, showFacilities]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Map Filter Controls & Legend Bar */}
      <div className="card" style={{ padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
          <span style={{ fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Layers size={16} /> GIS COMMAND LAYERS:
          </span>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showCriticalOnly}
              onChange={(e) => setShowCriticalOnly(e.target.checked)}
            />
            <span style={{ color: '#fca5a5', fontWeight: 700 }}>🚨 Critical Only ({requests.filter(r => r.priority_level === 'CRITICAL').length})</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showResponders}
              onChange={(e) => setShowResponders(e.target.checked)}
            />
            <span style={{ color: '#60a5fa' }}>👮 Responders ({responders.length})</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showVolunteers}
              onChange={(e) => setShowVolunteers(e.target.checked)}
            />
            <span style={{ color: '#c084fc' }}>🤝 Volunteers ({volunteers.length})</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showFacilities}
              onChange={(e) => setShowFacilities(e.target.checked)}
            />
            <span style={{ color: '#34d399' }}>⛺ Facilities ({facilities.shelters.length + facilities.hospitals.length})</span>
          </label>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span> Critical
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f97316', display: 'inline-block' }}></span> High
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#eab308', display: 'inline-block' }}></span> Medium
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span> Low
          </span>
        </div>
      </div>

      {/* Map Element */}
      <div ref={mapContainerRef} className="map-container" />
    </div>
  );
};
