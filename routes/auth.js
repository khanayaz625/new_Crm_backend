const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { auth } = require('../middleware/auth');

// Login Route with Auto-Bootstrap
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`Login attempt for: ${email}`);

    // Bootstrap: Create first admin if DB is empty
    const userCount = await User.countDocuments();
    console.log(`Current user count: ${userCount}`);
    
    if (userCount === 0) {
      const bootstrapAdmin = new User({
        name: 'Super Admin',
        email: 'admin@crm.com',
        password: 'admin123', // Model will hash this
        role: 'admin'
      });
      await bootstrapAdmin.save();
      console.log('Bootstrap: Created default admin (admin@crm.com / admin123)');
    }

    const { email, password } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    console.log(`Login attempt for: ${cleanEmail}`);

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      console.log(`User not found: ${cleanEmail}`);
      return res.status(400).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log(`Password match for ${cleanEmail}: ${isMatch}`);
    
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Register Route
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    
    const userExists = await User.findOne({ email: cleanEmail });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const user = new User({
      name,
      email: cleanEmail,
      password: password, // The User model's pre-save hook will hash this once.
      role: role || 'employee'
    });

    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Current User
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
