// api/collect-data.js
const { MongoClient } = require('mongodb');

// Access the MongoDB URI from environment variables
const uri = process.env.MONGODB_URI;

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  try {
    const client = await MongoClient.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const db = client.db('botDetectorDB'); // Replace with your database name
    cachedClient = client;
    cachedDb = db;
    return { client, db };
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    throw new Error('Database connection failed');
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Only POST requests allowed' });
    return;
  }

  const interactionData = req.body;

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('interactions'); // Replace with your collection name
    await collection.insertOne(interactionData);
    res.status(200).json({ message: 'Data saved successfully' });
  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).json({ message: 'Error saving data' });
  }
};
