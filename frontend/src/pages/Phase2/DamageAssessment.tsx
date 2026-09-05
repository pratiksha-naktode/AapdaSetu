import React, { useState } from 'react';
import { Sparkles, AlertTriangle, ShieldCheck, Upload, ArrowRight, Eye, CheckCircle2 } from 'lucide-react';

export const DamageAssessment: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<{
    severity: 'No obvious damage' | 'Minor visible damage' | 'Moderate visible damage' | 'Severe visible damage';
    confidence: number;
    indicators: string[];
    priorityBoost: number;
  } | null>(null);

  const sampleDamages = [
    {
      label: 'Submerged Ground Floor (Bhimavaram Drain Breach)',
      severity: 'Severe visible damage' as const,
      confidence: 0.94,
      indicators: ['Water level > 4 feet', 'Ground floor submerged', 'Structural evacuation required'],
      boost: +20
    },
    {
      label: 'Waterlogging & Wall Cracks',
      severity: 'Moderate visible damage' as const,
      confidence: 0.88,
      indicators: ['Visible exterior brick cracks', 'Standing water 1.5 feet'],
      boost: +10
    },
    {
      label: 'Minor Garden Inundation',
      severity: 'Minor visible damage' as const,
      confidence: 0.91,
      indicators: ['Boundary wall safe', 'Living quarters dry'],
      boost: 0
    }
  ];

  const handleSimulateAnalysis = (sample: typeof sampleDamages[0]) => {
    setAnalyzing(true);
    setAnalysisResult(null);
    setTimeout(() => {
      setAnalyzing(false);
      setAnalysisResult({
        severity: sample.severity,
        confidence: sample.confidence,
        indicators: sample.indicators,
        priorityBoost: sample.boost
      });
    }, 1200);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Phase 2 Architecture Banner */}
      <div style={{ background: 'linear-gradient(135deg, #1e1b4b, #0f172a)', border: '1px solid #6366f1', padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          <Sparkles size={14} /> PHASE 2 ARCHITECTURE SPECIFICATION
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#e0e7ff' }}>
          AI Computer Vision Damage Triage Architecture
        </h1>
        <p style={{ color: '#c7d2fe', fontSize: '0.9rem', marginTop: '0.35rem', lineHeight: 1.5 }}>
          Operational pipeline overview: Citizen photo uploads are processed by a vision model, classifying visible damage to feed into the Priority Engine triage formula.
        </p>

        {/* Anti-Fake Disclaimer */}
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginTop: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
          <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.8rem', color: '#fca5a5' }}>
            <strong>CRITICAL SAFETY NOTICE:</strong> This AI system is designed strictly for emergency triage and situational awareness indication. It does NOT certify building structural integrity or engineer safety sign-offs.
          </div>
        </div>
      </div>

      {/* Interactive Workflow Pipeline */}
      <div className="card" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>
          Interactive Vision Model Triage Simulator
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Select a test flood image scenario below to simulate computer vision feature extraction:
        </p>

        <div className="grid-3" style={{ marginBottom: '2rem' }}>
          {sampleDamages.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSimulateAnalysis(s)}
              className="card"
              style={{
                cursor: 'pointer',
                textAlign: 'left',
                padding: '1.25rem',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem'
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8' }}>SCENARIO {idx + 1}</span>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '0.2rem', color: '#fff' }}>
                  {s.label}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#6366f1', fontSize: '0.8rem', fontWeight: 700 }}>
                <span>Simulate Analysis</span> <ArrowRight size={14} />
              </div>
            </button>
          ))}
        </div>

        {analyzing && (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#a5b4fc', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
            <div className="spin" style={{ display: 'inline-block', marginBottom: '0.5rem' }}>⚙️</div>
            <div>Extracting structural feature vectors & estimating flood severity...</div>
          </div>
        )}

        {analysisResult && (
          <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid #6366f1', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase' }}>
                  Model Output Category
                </span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#fff' }}>
                  {analysisResult.severity}
                </h3>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.85rem', color: '#86efac', fontWeight: 700 }}>
                  Confidence: {(analysisResult.confidence * 100).toFixed(1)}%
                </span>
                <div style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 700 }}>
                  Priority Engine Score Adjustment: +{analysisResult.priorityBoost} pts
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <strong>Detected Visual Indicators:</strong>
              <ul style={{ paddingLeft: '1.25rem', marginTop: '0.35rem' }}>
                {analysisResult.indicators.map((ind, i) => (
                  <li key={i}>{ind}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
