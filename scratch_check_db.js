const mongoose = require('mongoose');

const checkDB = async () => {
  const uri = 'mongodb+srv://crm:crm123@mern.u7ed3ur.mongodb.net/?appName=Mern';
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('Connected!');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('The database is completely EMPTY (no collections found).');
    } else {
      console.log(`Found ${collections.length} collections:`);
      for (const col of collections) {
        const count = await db.collection(col.name).countDocuments();
        console.log(`- ${col.name}: ${count} documents`);
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Connection failed:', err.message);
    process.exit(1);
  }
};

checkDB();
