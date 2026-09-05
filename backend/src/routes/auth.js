import express from 'express';
import { repository } from '../store/repository.js';

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, role } = req.body;
  const allUsers = repository.getAllUsers();

  let user = allUsers.find(u => 
    (email && u.email.toLowerCase() === email.toLowerCase()) || 
    (role && u.role === role.toUpperCase())
  );

  if (!user) {
    user = repository.updateUserProfile(`user-${Date.now()}`, {
      email: email || 'citizen@varahi.org',
      full_name: email ? email.split('@')[0] : 'Citizen User',
      role: (role || 'CITIZEN').toUpperCase(),
      phone: '+919999999999',
      avatar_url: null
    });
  }

  return res.json({
    token: `varahi-jwt-${user.id}`,
    user
  });
});

router.post('/register', (req, res) => {
  const { email, full_name, phone, role } = req.body;
  const newUser = repository.updateUserProfile(`user-${Date.now()}`, {
    email: email || 'citizen@varahi.org',
    full_name: full_name || 'Citizen User',
    phone: phone || '+919999999999',
    role: (role || 'CITIZEN').toUpperCase(),
    avatar_url: null
  });

  return res.status(201).json({
    message: 'User registered successfully',
    user: newUser,
    token: `varahi-jwt-${newUser.id}`
  });
});

router.get('/me', (req, res) => {
  const userId = req.query.userId || req.headers['x-user-id'];
  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }

  const user = repository.getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json({ user });
});

export default router;
