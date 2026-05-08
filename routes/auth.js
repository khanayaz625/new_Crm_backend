const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const user = new User({ name, email, password, role });
    await user.save();

    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Registration failed: ' + err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for:', email);
    
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found');
      return res.status(400).json({ message: 'Invalid credentials (User not found)' });
    }

    console.log('User found, comparing passwords...');
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Password mismatch');
      return res.status(400).json({ message: 'Invalid credentials (Password mismatch)' });
    }

    const secret = process.env.JWT_SECRET || 'fallback_secret_for_debugging';
    console.log('Signing token...');
    
    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      secret, 
      { expiresIn: '1d' }
    );
    
    console.log('Login successful');
    res.json({ token, user: { id: user._id, name: user.name, role: user.role } });
  } catch (err) {
    console.error('SERVER LOGIN ERROR:', err);
    res.status(500).json({ message: 'Server error during login: ' + err.message });
  }
});

module.exports = router;
