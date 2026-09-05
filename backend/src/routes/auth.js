import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { repository } from '../store/repository.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password, expected_role, expectedRole } = req.body;
  const roleCheck = expected_role || expectedRole;

  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  if (!password || typeof password !== 'string' || !password.trim()) {
    return res.status(400).json({ error: 'Password is required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const { user, error } = await repository.authenticateUser(normalizedEmail, password);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  // Role validation: if user's actual role does not match expected role, reject login
  if (roleCheck && user.role !== roleCheck.toUpperCase()) {
    const roleTitles = {
      CITIZEN: 'Citizen',
      RESPONDER: 'Responder',
      VOLUNTEER: 'Volunteer',
      ADMIN: 'Admin'
    };
    const expectedTitle = roleTitles[roleCheck.toUpperCase()] || roleCheck;
    const actualTitle = roleTitles[user.role] || user.role;

    let errorMessage = '';
    if (expectedTitle === 'Admin') {
      errorMessage = 'This account is not registered as an Admin.';
    } else {
      errorMessage = `This account is not registered as a ${expectedTitle}.`;
    }

    return res.status(403).json({
      error: errorMessage,
      code: 'ROLE_MISMATCH',
      expected_role: roleCheck.toUpperCase(),
      actual_role: user.role
    });
  }

  return res.json({
    token: `varahi-jwt-${user.id}`,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      phone: user.phone || null,
      avatar_url: user.avatar_url || null
    }
  });
});

/**
 * POST /api/auth/register/citizen
 */
router.post('/register/citizen', async (req, res) => {
  try {
    const { full_name, name, email, phone, password, confirm_password } = req.body;
    const finalName = full_name || name;

    if (!finalName || !email || !password) {
      return res.status(400).json({ error: 'Full name, email, and password are required.' });
    }

    if (confirm_password && password !== confirm_password) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const user = await repository.registerCitizen({ full_name: finalName, email, phone, password });

    return res.status(201).json({
      message: 'Account created successfully! Please log in to continue.',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/auth/register/volunteer
 */
router.post('/register/volunteer', async (req, res) => {
  try {
    const { full_name, name, email, phone, password, confirm_password, capabilities, vehicle_type } = req.body;
    const finalName = full_name || name;

    if (!finalName || !email || !password) {
      return res.status(400).json({ error: 'Full name, email, and password are required.' });
    }

    if (confirm_password && password !== confirm_password) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const user = await repository.registerVolunteer({
      full_name: finalName,
      email,
      phone,
      password,
      capabilities: Array.isArray(capabilities) ? capabilities : [],
      vehicle_type
    });

    return res.status(201).json({
      message: 'Volunteer registered successfully! Please log in to continue.',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/auth/register/responder
 */
router.post('/register/responder', async (req, res) => {
  try {
    const { full_name, name, email, phone, password, confirm_password, responder_type, badge_number } = req.body;
    const finalName = full_name || name;

    if (!finalName || !email || !password) {
      return res.status(400).json({ error: 'Full name, email, and password are required.' });
    }

    if (confirm_password && password !== confirm_password) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const user = await repository.registerResponder({
      full_name: finalName,
      email,
      phone,
      password,
      responder_type: responder_type || 'RESCUE_TEAM',
      badge_number: badge_number || 'PENDING_VERIFICATION'
    });

    return res.status(201).json({
      message: 'Responder credentials submitted successfully! Please sign in to your unit portal.',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/auth/register (Generic legacy fallback - disallows ADMIN)
 */
router.post('/register', async (req, res) => {
  const { email, password, full_name, name, phone, role } = req.body;
  const finalName = full_name || name;

  if (role && role.toUpperCase() === 'ADMIN') {
    return res.status(403).json({ error: 'Public admin registration is not permitted.' });
  }

  const requestedRole = (role || 'CITIZEN').toUpperCase();
  try {
    let user;
    if (requestedRole === 'VOLUNTEER') {
      user = await repository.registerVolunteer({ full_name: finalName, email, phone, password });
    } else if (requestedRole === 'RESPONDER') {
      user = await repository.registerResponder({ full_name: finalName, email, phone, password });
    } else {
      user = await repository.registerCitizen({ full_name: finalName, email, phone, password });
    }

    return res.status(201).json({
      message: 'User registered successfully. Please log in with your credentials.',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.get('/me', async (req, res) => {
  let userId = req.query.userId || req.headers['x-user-id'];
  const authHeader = req.headers['authorization'];
  if (!userId && authHeader && authHeader.startsWith('Bearer ')) {
    const rawToken = authHeader.substring(7);
    if (rawToken.startsWith('varahi-jwt-')) {
      userId = rawToken.replace('varahi-jwt-', '');
    } else {
      userId = rawToken;
    }
  }

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required. No valid token or user ID provided.' });
  }

  const user = await repository.getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found in Supabase' });
  }

  return res.json({ user });
});

export default router;
