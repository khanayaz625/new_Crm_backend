const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const seedEmployee = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm_db');
    
    const empExists = await User.findOne({ email: 'emp@crm.com' });
    if (empExists) {
      console.log('Employee already exists');
      process.exit();
    }

    const emp = new User({
      name: 'Sales Rep 1',
      email: 'emp@crm.com',
      password: 'emppassword123',
      role: 'employee'
    });

    await emp.save();
    console.log('Employee user created successfully');
    console.log('Email: emp@crm.com');
    console.log('Password: emppassword123');
    process.exit();
  } catch (err) {
    console.error('Error seeding employee:', err);
    process.exit(1);
  }
};

seedEmployee();
