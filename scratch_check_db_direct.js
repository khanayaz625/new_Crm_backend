const mongoose = require('mongoose');

const checkDB = async () => {
  // Direct connection string bypassing SRV
  const uri = 'mongodb://crm:crm123@ac-f6rrnfg-shard-00-00.u7ed3ur.mongodb.net:27017,ac-f6rrnfg-shard-00-01.u7ed3ur.mongodb.net:27017,ac-f6rrnfg-shard-00-02.u7ed3ur.mongodb.net:27017/?ssl=true&replicaSet=atlas-m4q4j9-shard-0&authSource=admin&appName=Mern';
  
  try {
    console.log('Connecting to MongoDB via direct nodes...');
    await mongoose.connect(uri);
    console.log('Connected!');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('The database is completely EMPTY.');
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
