import mongoose from 'mongoose';

const incidentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  timestamp: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now },
  source: String,
  location: String,
  rawDescription: String,
  score: Number,
  tier: String,
  status: { type: String, default: 'Active' },
  hazardType: String,
  confidence: Number,
  sensorSignals: mongoose.Schema.Types.Mixed,
  aiEnriched: Boolean,
  explanation: [String],
  recommendedActions: [String],
  compoundTypes: [String],
  isCompound: Boolean,
  snapshot: String,
  bcpScore: Number,
  lisScore: Number,
  cmModifier: Number,
  finalPriority: Number,
  rerankAfterSec: Number,
  _lastRerankedAt: Number,
  _dedupKey: String
});

const dispatchSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  incidentId: String,
  status: String,
  assignedUnits: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const callLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  incidentId: String,
  target: String,
  type: String, // internal, external_simulated
  status: String, // dialing, connected, voicemail, failed
  duration: Number,
  timestamp: { type: Date, default: Date.now }
});

const personnelDeploymentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  incidentId: String,
  personnelId: String,
  name: String,
  role: String,
  status: String, // dispatched, en_route, on_scene
  estimatedArrival: Date,
  timestamp: { type: Date, default: Date.now }
});

const guestSessionSchema = new mongoose.Schema({
  sessionToken: { type: String, required: true, unique: true },
  guest: mongoose.Schema.Types.Mixed,
  currentZone: String,
  loginAt: { type: Date, default: Date.now }
});

const movementHistorySchema = new mongoose.Schema({
  guestId: { type: String, required: true },
  zone: String,
  timestamp: { type: Date, default: Date.now }
});

const serviceRequestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  guestId: String,
  type: String,
  status: String,
  timestamp: { type: Date, default: Date.now }
});

export const Incident = mongoose.model('Incident', incidentSchema);
export const Dispatch = mongoose.model('Dispatch', dispatchSchema);
export const CallLog = mongoose.model('CallLog', callLogSchema);
export const PersonnelDeployment = mongoose.model('PersonnelDeployment', personnelDeploymentSchema);
export const GuestSession = mongoose.model('GuestSession', guestSessionSchema);
export const MovementHistory = mongoose.model('MovementHistory', movementHistorySchema);
export const ServiceRequest = mongoose.model('ServiceRequest', serviceRequestSchema);
