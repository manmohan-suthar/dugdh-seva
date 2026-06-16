import { MongoClient } from 'mongodb';

const DATABASE_DOCUMENT_ID = 'dairy-management';

export interface DBStructure {
  dairies: any[];
  customers: any[];
  charts: any[];
  prices: any[];
  collections: any[];
  sales: any[];
  advances: any[];
  payments: any[];
  receipts: any[];
}

function emptyDb(): DBStructure {
  return {
    dairies: [],
    customers: [],
    charts: [],
    prices: [],
    collections: [],
    sales: [],
    advances: [],
    payments: [],
    receipts: []
  };
}

export let db: DBStructure = emptyDb();

let client: MongoClient | null = null;
let saveQueue: Promise<void> = Promise.resolve();

function normalizeDb(data: Partial<DBStructure> | null | undefined): DBStructure {
  return {
    dairies: data?.dairies || [],
    customers: data?.customers || [],
    charts: data?.charts || [],
    prices: data?.prices || [],
    collections: data?.collections || [],
    sales: data?.sales || [],
    advances: data?.advances || [],
    payments: data?.payments || [],
    receipts: data?.receipts || []
  };
}

async function getCollection() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is required. Add your MongoDB Atlas connection string to .env.local or the hosting environment.');
  }

  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }

  const databaseName = process.env.MONGODB_DB_NAME || 'dairy_management';
  return client.db(databaseName).collection<any>('app_data');
}

export async function initDb() {
  const collection = await getCollection();
  const storedDb = await collection.findOne({ _id: DATABASE_DOCUMENT_ID });

  if (storedDb) {
    db = normalizeDb(storedDb);
    return;
  }

  db = emptyDb();
  await saveDb();
}

export async function refreshDb() {
  await saveQueue;
  const collection = await getCollection();
  const storedDb = await collection.findOne({ _id: DATABASE_DOCUMENT_ID });
  db = normalizeDb(storedDb);
}

export function saveDb() {
  const snapshot = structuredClone(db);

  saveQueue = saveQueue.then(async () => {
    const collection = await getCollection();
    await collection.replaceOne(
      { _id: DATABASE_DOCUMENT_ID },
      { _id: DATABASE_DOCUMENT_ID, ...snapshot },
      { upsert: true }
    );
  });

  return saveQueue;
}

export async function closeDb() {
  await saveQueue;
  await client?.close();
  client = null;
}

export function generateId() {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

export async function seedDairyDefaults(dairyId: string) {
  const existingPrices = db.prices.filter(p => p.dairyId === dairyId);
  if (existingPrices.length === 0) {
    db.prices.push(
      { _id: generateId(), dairyId, animalType: 'cow', pricePerLiter: 60, updatedAt: new Date().toISOString() },
      { _id: generateId(), dairyId, animalType: 'buffalo', pricePerLiter: 80, updatedAt: new Date().toISOString() }
    );
  }

  const existingCharts = db.charts.filter(c => c.dairyId === dairyId);
  if (existingCharts.length === 0) {
    const cowEntries: any[] = [];
    const buffaloEntries: any[] = [];

    for (let fat = 3.0; fat <= 5.5; fat = parseFloat((fat + 0.1).toFixed(1))) {
      for (let snf = 7.5; snf <= 9.0; snf = parseFloat((snf + 0.1).toFixed(1))) {
        const fatFactor = (fat - 3.0) * 4;
        const snfFactor = (snf - 7.5) * 3;
        cowEntries.push({ fat, snf, pricePerLiter: parseFloat((35.0 + fatFactor + snfFactor).toFixed(2)) });
      }
    }

    for (let fat = 5.0; fat <= 9.0; fat = parseFloat((fat + 0.1).toFixed(1))) {
      for (let snf = 8.0; snf <= 10.0; snf = parseFloat((snf + 0.1).toFixed(1))) {
        const fatFactor = (fat - 5.0) * 5;
        const snfFactor = (snf - 8.0) * 4;
        buffaloEntries.push({ fat, snf, pricePerLiter: parseFloat((52.0 + fatFactor + snfFactor).toFixed(2)) });
      }
    }

    db.charts.push(
      { _id: generateId(), dairyId, animalType: 'cow', entries: cowEntries, updatedAt: new Date().toISOString() },
      { _id: generateId(), dairyId, animalType: 'buffalo', entries: buffaloEntries, updatedAt: new Date().toISOString() }
    );
  }

  await saveDb();
}
