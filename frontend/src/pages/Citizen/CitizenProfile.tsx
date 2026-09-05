import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Camera, CheckCircle2, AlertCircle, User, Phone, Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const CitizenProfile: React.FC = () => {
  const { user, updateAvatar, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [fullName, setFullName] = useState<string>(user?.full_name || '');
  const [phone, setPhone] = useState<string>(user?.phone || '');
  const [email, setEmail] = useState<string>(user?.email || '');

  React.useEffect(() => {
    if (user?.full_name) setFullName(user.full_name);
    if (user?.phone) setPhone(user.phone);
    if (user?.email) setEmail(user.email);
  }, [user]);

  // Upload States
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user?.id) {
      setUploadStatus({
        type: 'error',
        message: 'Authentication required. Please log in to upload your profile photo.'
      });
      return;
    }

    setUploadStatus(null);

    // 1. Validation: Allowed formats
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setUploadStatus({
        type: 'error',
        message: 'Invalid file type. Please upload a JPG, JPEG, PNG, or WEBP image.'
      });
      return;
    }

    // 2. Validation: File size (< 5MB)
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadStatus({
        type: 'error',
        message: 'File too large. Maximum allowed size is 5MB.'
      });
      return;
    }

    setIsUploading(true);

    try {
      // Convert to Base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;

        try {
          const res = await fetch(`${API_BASE}/api/users/${user.id}/avatar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: base64Data,
              mimeType: file.type
            })
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Upload failed');
          }

          const data = await res.json();
          // Update global state immediately without page reload
          updateAvatar(data.avatar_url);
          setUploadStatus({
            type: 'success',
            message: 'Profile photo updated and saved to storage successfully!'
          });
        } catch (uploadErr: any) {
          setUploadStatus({
            type: 'error',
            message: uploadErr.message || 'Upload failed. Please try again.'
          });
        } finally {
          setIsUploading(false);
        }
      };

      reader.onerror = () => {
        setIsUploading(false);
        setUploadStatus({
          type: 'error',
          message: 'Error reading file.'
        });
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsUploading(false);
      setUploadStatus({
        type: 'error',
        message: err.message || 'Unexpected error during upload.'
      });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      alert('You must be logged in to save profile changes.');
      return;
    }
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await updateProfile({
        full_name: fullName,
        phone,
        email
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      alert('Failed to save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <Link to="/citizen" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          <ArrowLeft size={16} /> Back to Citizen Portal
        </Link>
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <User size={48} color="#3b82f6" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>No Active Citizen Session</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
            Please sign in with your registered email to view and manage your profile, contact details, and persistent profile photo.
          </p>
          <div style={{ marginTop: '1.5rem' }}>
            <Link to="/login" className="btn btn-primary" style={{ display: 'inline-flex', padding: '0.6rem 1.5rem', fontSize: '0.9rem' }}>
              Sign In to Your Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Get initials for fallback avatar
  const initials = (user?.full_name || 'Citizen')
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Link to="/citizen" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
        <ArrowLeft size={16} /> Back to Citizen Portal
      </Link>

      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem', marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Citizen Profile</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            Manage your personal contact details and persistent profile photo.
          </p>
        </div>

        {/* Profile Photo Upload Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', marginBottom: '2rem', background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ position: 'relative' }}>
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name}
                style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid var(--rescue-blue)',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                }}
              />
            ) : (
              <div
                style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3b82f6, #1e40af)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  border: '3px solid #60a5fa'
                }}
              >
                {initials}
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                background: 'var(--rescue-blue)',
                color: '#fff',
                border: '2px solid var(--bg-card)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Change Profile Photo"
            >
              <Camera size={16} />
            </button>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>Profile Photo</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Upload JPG, PNG or WEBP (Max 5MB). Photo is stored persistently in Supabase Storage and appears on your requests and dashboard.
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/jpeg,image/png,image/webp,image/jpg"
              style={{ display: 'none' }}
            />

            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="btn btn-outline"
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', gap: '0.35rem' }}
              >
                {isUploading ? (
                  <>
                    <RefreshCw size={12} className="spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <Camera size={14} /> Upload New Photo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Upload Status Notification */}
        {uploadStatus && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
              background: uploadStatus.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${uploadStatus.type === 'success' ? '#10b981' : '#ef4444'}`,
              color: uploadStatus.type === 'success' ? '#86efac' : '#fca5a5'
            }}
          >
            {uploadStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{uploadStatus.message}</span>
          </div>
        )}

        {/* Edit Contact Details Form */}
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <User size={14} /> Full Name
            </label>
            <input
              type="text"
              className="form-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Phone size={14} /> Contact Phone Number
            </label>
            <input
              type="tel"
              className="form-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91..."
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Mail size={14} /> Email Address
            </label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your-email@varahi.org"
              required
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary"
              style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem' }}
            >
              {isSaving ? 'Saving Profile...' : 'Save Profile Changes'}
            </button>

            {saveSuccess && (
              <span style={{ color: '#86efac', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <CheckCircle2 size={14} /> Saved successfully!
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
