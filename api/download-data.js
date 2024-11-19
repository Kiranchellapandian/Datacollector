// api/download-data.js
const { MongoClient } = require('mongodb');
const stringify = require('csv-stringify/lib/sync');

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
  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Only GET requests allowed' });
    return;
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('interactions'); // Replace with your collection name
    const data = await collection.find({}).toArray();

    if (data.length === 0) {
      res.status(200).send('No data available to download.');
      return;
    }

    // Convert JSON to CSV
    const csv = stringify(data, { header: true });

    // Set response headers to download the CSV file
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="interactions.csv"');
    res.status(200).send(csv);
  } catch (error) {
    console.error('Error retrieving data:', error);
    res.status(500).json({ message: 'Error retrieving data' });
  }
};
