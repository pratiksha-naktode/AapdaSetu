import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { repository } from '../store/repository.js';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../../uploads/avatars');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const router = express.Router();

/**
 * GET /api/users/:id
 * Fetch user profile
 */
router.get('/:id', async (req, res) => {
  const user = await repository.getUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user });
});

/**
 * PUT /api/users/:id
 * Update user profile
 */
router.put('/:id', async (req, res) => {
  const { full_name, phone, email } = req.body;
  const updated = await repository.updateUserProfile(req.params.id, {
    full_name,
    phone,
    email
  });
  res.json({ message: 'Profile updated successfully', user: updated });
});

/**
 * POST /api/users/:id/avatar
 * Upload and persist user avatar
 */
router.post('/:id/avatar', async (req, res) => {
  const userId = req.params.id;
  const { imageBase64, mimeType } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 is required' });
  }

  // 1. Validation: Allowed formats
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const effectiveMime = (mimeType || 'image/jpeg').toLowerCase();
  if (!allowedMimes.includes(effectiveMime)) {
    return res.status(400).json({
      error: 'Invalid file format. Allowed formats: JPG, JPEG, PNG, WEBP.'
    });
  }

  // 2. Validation: File size (< 5MB)
  // base64 size approximation: length * 3/4
  const base64Clean = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
  const sizeInBytes = Math.ceil((base64Clean.length * 3) / 4);
  const maxBytes = 5 * 1024 * 1024; // 5 MB
  if (sizeInBytes > maxBytes) {
    return res.status(400).json({
      error: 'File too large. Maximum allowed size is 5MB.'
    });
  }

  try {
    const buffer = Buffer.from(base64Clean, 'base64');
    const ext = effectiveMime.split('/')[1] || 'jpg';
    let avatarUrl = '';

    // Check if Supabase client is available with storage credentials
    if (config.supabase.url && config.supabase.serviceRoleKey) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
        const fileName = `${userId}/avatar.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('profile-images')
          .upload(fileName, buffer, {
            contentType: effectiveMime,
            upsert: true
          });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('profile-images')
            .getPublicUrl(fileName);
          avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
        } else {
          console.warn('[Avatar] Supabase storage upload warning:', uploadError.message);
        }
      } catch (storageErr) {
        console.warn('[Avatar] Supabase storage upload failed, falling back to local persistent store:', storageErr.message);
      }
    }

    // Local persistent storage fallback
    if (!avatarUrl) {
      const fileName = `${userId}_avatar.${ext}`;
      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, buffer);
      avatarUrl = `http://localhost:5000/uploads/avatars/${fileName}?t=${Date.now()}`;
    }

    // Persist in repository
    const updatedUser = await repository.updateUserProfile(userId, { avatar_url: avatarUrl });

    console.log(`[Avatar] Successfully updated avatar for user ${userId}: ${avatarUrl}`);
    return res.json({
      message: 'Avatar uploaded and updated successfully',
      avatar_url: avatarUrl,
      user: updatedUser
    });
  } catch (err) {
    console.error('[Avatar Upload Error]', err);
    return res.status(500).json({ error: 'Failed to process avatar upload', details: err.message });
  }
});

export default router;
