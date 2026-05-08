const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm_db');
    
    const adminExists = await User.findOne({ email: 'admin@crm.com' });
    if (adminExists) {
      console.log('Admin already exists');
      process.exit();
    }

    const admin = new User({
      name: 'Super Admin',
      email: 'admin@crm.com',
      password: 'adminpassword123',
      role: 'admin'
    });

    await admin.save();
    console.log('Admin user created successfully');
    console.log('Email: admin@crm.com');
    console.log('Password: adminpassword123');
    process.exit();
  } catch (err) {
    console.error('Error seeding admin:', err);
    process.exit(1);
  }
};

seedAdmin();
