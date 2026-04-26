import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Incident, Dispatch, CallLog, PersonnelDeployment, GuestSession, MovementHistory, ServiceRequest } from './models.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
let isConnected = false;

// Memory Cache
const cache = new Map();

async function connectDB() {
  if (!MONGODB_URI) {
    console.warn("[Store] MONGODB_URI not found. Please provide a valid URI in .env.");
    return;
  }
  try {
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
    console.log("[Store] Successfully connected to MongoDB.");
  } catch (err) {
    console.error("[Store] MongoDB connection error:", err);
  }
}

async function loadAllData() {
  if (!isConnected) return;
  console.log("[Store] Loading data from MongoDB...");

  try {
    cache.set('incidents', await Incident.find({}).lean() || []);
    cache.set('dispatchLog', await Dispatch.find({}).lean() || []);
    cache.set('callLog', await CallLog.find({}).lean() || []);
    cache.set('personnelDeployments', await PersonnelDeployment.find({}).lean() || []);
    
    // Arrays representing Maps
    const sessions = await GuestSession.find({}).lean();
    cache.set('activeSessions', sessions.map(s => [s.sessionToken, { guest: s.guest, currentZone: s.currentZone, loginAt: s.loginAt }]));
    
    const movements = await MovementHistory.find({}).lean();
    // Group movements by guestId to match the Map<guestId, array> structure
    const movementMap = {};
    for (const m of movements) {
      if (!movementMap[m.guestId]) movementMap[m.guestId] = [];
      movementMap[m.guestId].push({ zone: m.zone, timestamp: m.timestamp });
    }
    cache.set('movementHistory', Object.entries(movementMap));

    const requests = await ServiceRequest.find({}).lean();
    const reqMap = {};
    for (const r of requests) {
      if (!reqMap[r.guestId]) reqMap[r.guestId] = [];
      reqMap[r.guestId].push({ id: r.id, type: r.type, status: r.status, timestamp: r.timestamp });
    }
    cache.set('serviceRequests', Object.entries(reqMap));

    console.log("[Store] Data loaded successfully.");
  } catch (err) {
    console.error("[Store] Error loading data from MongoDB:", err);
  }
}

/**
 * Synchronously retrieve data for a given key.
 * This pulls from the memory cache populated at startup.
 */
function loadData(key, defaultValue = null) {
  if (cache.has(key)) {
    return cache.get(key);
  }
  return defaultValue;
}

/**
 * Asynchronously save data for a given key to MongoDB.
 * The application passes the entire array. We use bulk operations to sync it.
 */
async function saveData(key, data) {
  cache.set(key, data); // update memory cache
  
  if (!isConnected) return;

  try {
    if (key === 'incidents') {
      const ops = data.map(inc => ({
        updateOne: { filter: { id: inc.id }, update: { $set: inc }, upsert: true }
      }));
      if (ops.length > 0) await Incident.bulkWrite(ops);
    } else if (key === 'dispatchLog') {
       const ops = data.map(d => ({
        updateOne: { filter: { id: d.id }, update: { $set: d }, upsert: true }
      }));
      if (ops.length > 0) await Dispatch.bulkWrite(ops);
    } else if (key === 'callLog') {
       const ops = data.map(c => ({
        updateOne: { filter: { id: c.id }, update: { $set: c }, upsert: true }
      }));
      if (ops.length > 0) await CallLog.bulkWrite(ops);
    } else if (key === 'personnelDeployments') {
       const ops = data.map(p => ({
        updateOne: { filter: { id: p.id }, update: { $set: p }, upsert: true }
      }));
      if (ops.length > 0) await PersonnelDeployment.bulkWrite(ops);
    } else if (key === 'activeSessions') {
       // activeSessions is an array of [sessionToken, data]
       const ops = data.map(([token, info]) => ({
        updateOne: { 
            filter: { sessionToken: token }, 
            update: { $set: { sessionToken: token, ...info } }, 
            upsert: true 
        }
      }));
      if (ops.length > 0) await GuestSession.bulkWrite(ops);
    } else if (key === 'movementHistory') {
        // data is array of [guestId, array_of_movements]
        await MovementHistory.deleteMany({}); // simpler to recreate history for demo
        const docs = [];
        for (const [guestId, moves] of data) {
            for (const m of moves) {
                docs.push({ guestId, zone: m.zone, timestamp: m.timestamp });
            }
        }
        if (docs.length > 0) await MovementHistory.insertMany(docs);
    } else if (key === 'serviceRequests') {
        await ServiceRequest.deleteMany({});
        const docs = [];
        for (const [guestId, reqs] of data) {
            for (const r of reqs) {
                docs.push({ guestId, id: r.id, type: r.type, status: r.status, timestamp: r.timestamp });
            }
        }
        if (docs.length > 0) await ServiceRequest.insertMany(docs);
    }
  } catch (err) {
    console.error(`[Store] Error saving ${key} to MongoDB:`, err.message);
  }
}

function mapToArray(map) {
  return Array.from(map.entries());
}

function arrayToMap(array) {
  return new Map(array);
}

export default {
  connectDB,
  loadAllData,
  loadData,
  saveData,
  mapToArray,
  arrayToMap
};
