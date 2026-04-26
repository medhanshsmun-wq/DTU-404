// ============================================================
// GUEST SERVICE — Guest Registry, Auth, Movement, Services
// ============================================================
// Manages all guest-facing functionality:
//   - Guest authentication (room + last name)
//   - Movement tracking (self-reported zone)
//   - Service requests (room service, housekeeping, etc.)
//   - Emergency info (floor plans, evacuation routes)
//   - Incident reporting (feeds into main pipeline)
// ============================================================

import store from "./store.js";

// ── Mock Guest Database ───────────────────────────────────

const GUESTS = [
  { id: "G001", room: "101", firstName: "Amara", lastName: "Patel", checkIn: "2026-04-12", checkOut: "2026-04-16", phone: "+91-9876543210", vip: false },
  { id: "G002", room: "205", firstName: "James", lastName: "Chen", checkIn: "2026-04-13", checkOut: "2026-04-17", phone: "+1-555-0123", vip: true },
  { id: "G003", room: "312", firstName: "Sofia", lastName: "Rossi", checkIn: "2026-04-14", checkOut: "2026-04-18", phone: "+39-333-1234567", vip: false },
  { id: "G004", room: "418", firstName: "Rajesh", lastName: "Kumar", checkIn: "2026-04-11", checkOut: "2026-04-15", phone: "+91-9988776655", vip: true },
  { id: "G005", room: "502", firstName: "Emily", lastName: "Watson", checkIn: "2026-04-14", checkOut: "2026-04-20", phone: "+44-7700-900123", vip: false },
  { id: "G006", room: "110", firstName: "Hiroshi", lastName: "Tanaka", checkIn: "2026-04-13", checkOut: "2026-04-16", phone: "+81-90-1234-5678", vip: false },
  { id: "G007", room: "225", firstName: "Fatima", lastName: "Al-Rashid", checkIn: "2026-04-12", checkOut: "2026-04-19", phone: "+971-50-123-4567", vip: true },
  { id: "G008", room: "333", firstName: "Lucas", lastName: "Müller", checkIn: "2026-04-14", checkOut: "2026-04-17", phone: "+49-170-1234567", vip: false },
  // Demo guest — easy to remember
  { id: "G999", room: "100", firstName: "Demo", lastName: "Guest", checkIn: "2026-04-10", checkOut: "2026-04-30", phone: "+91-0000000000", vip: true },
];

// ── Zones ─────────────────────────────────────────────────

export const ZONES = [
  { id: "lobby", name: "Main Lobby", floor: 0, building: "Palace Wing" },
  { id: "tower_lobby", name: "Tower Lobby", floor: 0, building: "Tower Wing" },
  { id: "restaurant_sea", name: "Sea Lounge Restaurant", floor: 0, building: "Palace Wing" },
  { id: "restaurant_masala", name: "Masala Kraft", floor: 0, building: "Palace Wing" },
  { id: "pool", name: "Swimming Pool & Spa", floor: 0, building: "Palace Wing" },
  { id: "gym", name: "Fitness Center", floor: 1, building: "Tower Wing" },
  { id: "conference_a", name: "Conference Hall A", floor: 1, building: "Palace Wing" },
  { id: "conference_b", name: "Conference Hall B", floor: 1, building: "Tower Wing" },
  { id: "ballroom", name: "Crystal Ballroom", floor: 1, building: "Palace Wing" },
  { id: "floor_1", name: "Room Floor 1", floor: 1, building: "Palace Wing" },
  { id: "floor_2", name: "Room Floor 2", floor: 2, building: "Palace Wing" },
  { id: "floor_3", name: "Room Floor 3", floor: 3, building: "Palace Wing" },
  { id: "floor_4", name: "Room Floor 4", floor: 4, building: "Tower Wing" },
  { id: "floor_5", name: "Room Floor 5", floor: 5, building: "Tower Wing" },
  { id: "terrace", name: "Gateway Terrace", floor: 0, building: "Palace Wing" },
  { id: "parking", name: "Basement Parking", floor: -1, building: "Tower Wing" },
  { id: "garden", name: "Heritage Garden", floor: 0, building: "Outdoor" },
];

// ── Session State ─────────────────────────────────────────

let activeSessions = new Map(); // sessionToken → { guest, currentZone, loginAt }
let movementHistory = new Map(); // guestId → [ { zone, timestamp } ]
let serviceRequests = new Map(); // guestId → [ { id, type, ... } ]

export function initGuestData() {
  activeSessions = store.arrayToMap(store.loadData('activeSessions', []));
  movementHistory = store.arrayToMap(store.loadData('movementHistory', []));
  serviceRequests = store.arrayToMap(store.loadData('serviceRequests', []));
}

function saveGuestData() {
  store.saveData('activeSessions', store.mapToArray(activeSessions));
  store.saveData('movementHistory', store.mapToArray(movementHistory));
  store.saveData('serviceRequests', store.mapToArray(serviceRequests));
}

setInterval(saveGuestData, 5000);

// ── Helpers ───────────────────────────────────────────────

function genSessionToken() {
  return "GST-" + Date.now().toString(36) + Math.random().toString(36).substr(2, 8);
}

function genRequestId() {
  return "SRQ-" + Date.now().toString(36) + Math.random().toString(36).substr(2, 4).toUpperCase();
}

// ============================================================
// AUTHENTICATION
// ============================================================

/**
 * Authenticate a guest by room number + last name.
 * Returns { success, token, guest } or { success: false, error }.
 */
export function authenticateGuest(room, lastName) {
  const normalizedRoom = String(room).trim();
  const normalizedName = (lastName || "").trim().toLowerCase();

  const guest = GUESTS.find(
    (g) => g.room === normalizedRoom && g.lastName.toLowerCase() === normalizedName
  );

  if (!guest) {
    return { success: false, error: "Invalid room number or last name" };
  }

  const token = genSessionToken();
  const session = {
    guest: { ...guest },
    currentZone: "lobby",
    loginAt: new Date().toISOString(),
  };
  activeSessions.set(token, session);

  // Init movement history
  if (!movementHistory.has(guest.id)) {
    movementHistory.set(guest.id, []);
  }
  movementHistory.get(guest.id).push({
    zone: "lobby",
    zoneName: "Main Lobby",
    timestamp: new Date().toISOString(),
  });

  // Init service requests
  if (!serviceRequests.has(guest.id)) {
    serviceRequests.set(guest.id, []);
  }

  return {
    success: true,
    token,
    guest: {
      id: guest.id,
      room: guest.room,
      firstName: guest.firstName,
      lastName: guest.lastName,
      checkIn: guest.checkIn,
      checkOut: guest.checkOut,
      vip: guest.vip,
    },
  };
}

/**
 * Validate a session token. Returns session or null.
 */
export function validateSession(token) {
  return activeSessions.get(token) || null;
}

/**
 * Get guest profile from token.
 */
export function getGuestProfile(token) {
  const session = activeSessions.get(token);
  if (!session) return null;

  return {
    ...session.guest,
    currentZone: session.currentZone,
    currentZoneName: ZONES.find((z) => z.id === session.currentZone)?.name || session.currentZone,
    loginAt: session.loginAt,
  };
}

// ============================================================
// MOVEMENT TRACKING
// ============================================================

/**
 * Update guest's current zone.
 */
export function updateGuestLocation(token, zoneId) {
  const session = activeSessions.get(token);
  if (!session) return null;

  const zone = ZONES.find((z) => z.id === zoneId);
  if (!zone) return { error: "Invalid zone" };

  session.currentZone = zoneId;

  const history = movementHistory.get(session.guest.id) || [];
  history.push({
    zone: zoneId,
    zoneName: zone.name,
    floor: zone.floor,
    building: zone.building,
    timestamp: new Date().toISOString(),
  });
  movementHistory.set(session.guest.id, history);

  return {
    currentZone: zoneId,
    zoneName: zone.name,
    floor: zone.floor,
    building: zone.building,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Get movement history for a guest.
 */
export function getMovementHistory(token) {
  const session = activeSessions.get(token);
  if (!session) return [];

  return (movementHistory.get(session.guest.id) || []).slice(-50).reverse();
}

/**
 * Get all zones.
 */
export function getAllZones() {
  return ZONES;
}

// ============================================================
// SERVICE REQUESTS
// ============================================================

const SERVICE_TYPES = {
  room_service: { 
    name: "Room Service", 
    icon: "utensils", 
    estimatedMin: 25,
    items: [
      { id: 'rs1', name: 'Taj Signature Burger', price: 25 },
      { id: 'rs2', name: 'Margherita Pizza', price: 18 },
      { id: 'rs3', name: 'Club Sandwich', price: 15 },
      { id: 'rs4', name: 'Masala Chai', price: 5 },
      { id: 'rs5', name: 'Fresh Orange Juice', price: 8 },
    ]
  },
  housekeeping: { 
    name: "Housekeeping", 
    icon: "sparkles", 
    estimatedMin: 15,
    items: [
      { id: 'hk1', name: 'Standard Cleaning', price: 0 },
      { id: 'hk2', name: 'Deep Cleaning', price: 50 },
      { id: 'hk3', name: 'Evening Turndown', price: 0 },
    ]
  },
  concierge: { name: "Concierge", icon: "bell-ring", estimatedMin: 5, items: [] },
  maintenance: { name: "Maintenance", icon: "wrench", estimatedMin: 20, items: [] },
  laundry: { 
    name: "Laundry", 
    icon: "shirt", 
    estimatedMin: 120,
    items: [
      { id: 'ld1', name: 'Standard Wash & Fold', price: 30 },
      { id: 'ld2', name: 'Dry Cleaning (Suit)', price: 45 },
      { id: 'ld3', name: 'Express Ironing', price: 15 },
    ]
  },
  towels: { name: "Extra Towels", icon: "bath", estimatedMin: 10, items: [] },
  minibar: { 
    name: "Minibar Refill", 
    icon: "cup-soda", 
    estimatedMin: 15,
    items: [
      { id: 'mb1', name: 'Full Refill', price: 100 },
      { id: 'mb2', name: 'Snacks Only', price: 40 },
      { id: 'mb3', name: 'Beverages Only', price: 60 },
    ]
  },
  wake_up: { name: "Wake-up Call", icon: "alarm-clock", estimatedMin: 0, items: [] },
  transport: { 
    name: "Transportation", 
    icon: "car", 
    estimatedMin: 20,
    items: [
      { id: 'tr1', name: 'Airport Transfer (Sedan)', price: 80 },
      { id: 'tr2', name: 'Airport Transfer (SUV)', price: 120 },
      { id: 'tr3', name: 'City Tour (Half Day)', price: 150 },
    ]
  },
};

/**
 * Submit a service request.
 */
export function createServiceRequest(token, type, details = "", items = []) {
  const session = activeSessions.get(token);
  if (!session) return null;

  const serviceType = SERVICE_TYPES[type];
  if (!serviceType) return { error: "Invalid service type" };

  const request = {
    id: genRequestId(),
    guestId: session.guest.id,
    room: session.guest.room,
    guestName: `${session.guest.firstName} ${session.guest.lastName}`,
    type,
    typeName: serviceType.name,
    typeIcon: serviceType.icon,
    details,
    items,
    status: "pending",
    estimatedMin: serviceType.estimatedMin,
    zone: session.currentZone,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const requests = serviceRequests.get(session.guest.id) || [];
  requests.push(request);
  serviceRequests.set(session.guest.id, requests);

  console.log(`[GuestService] 🔔 ${serviceType.icon} ${serviceType.name} request from Room ${session.guest.room} (${session.guest.firstName} ${session.guest.lastName})`);

  return request;
}

/**
 * Get service requests for a guest.
 */
export function getServiceRequests(token) {
  const session = activeSessions.get(token);
  if (!session) return [];

  return (serviceRequests.get(session.guest.id) || []).slice(-20).reverse();
}

/**
 * Get all service requests (Admin).
 */
export function getAllServiceRequestsAdmin() {
  const allReqs = [];
  for (const [guestId, reqs] of serviceRequests.entries()) {
    allReqs.push(...reqs);
  }
  return allReqs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Update service request status (Admin).
 */
export function updateServiceRequestStatusAdmin(guestId, reqId, status) {
  const requests = serviceRequests.get(guestId);
  if (!requests) return false;
  
  const req = requests.find(r => r.id === reqId);
  if (!req) return false;
  
  req.status = status;
  req.updatedAt = new Date().toISOString();
  return true;
}

/**
 * Get available service types.
 */
export function getServiceTypes() {
  return Object.entries(SERVICE_TYPES).map(([key, val]) => ({
    id: key,
    ...val,
  }));
}

// ============================================================
// EMERGENCY PLANS
// ============================================================

export function getEmergencyPlans() {
  return [
    {
      id: "fire",
      title: "Fire Evacuation",
      icon: "flame",
      color: "#ef4444",
      severity: "critical",
      summary: "Immediate evacuation procedures for fire emergencies",
      steps: [
        "Stay calm — do NOT use elevators",
        "Feel the door before opening — if hot, use alternate route",
        "Cover nose and mouth with wet cloth if smoke is present",
        "Follow illuminated EXIT signs to the nearest stairwell",
        "Crawl low if smoke is dense — cleaner air is near the floor",
        "Proceed to the Assembly Point at Gateway Terrace",
        "Report to the Fire Marshal at the assembly point",
        "DO NOT re-enter the building until the all-clear is given",
      ],
      assemblyPoint: "Gateway Terrace (near Gateway of India)",
      emergencyContact: "Hotel Security: EXT-100 | Fire: 101",
      schematic: "/schematics/fire.png",
    },
    {
      id: "earthquake",
      title: "Earthquake Protocol",
      icon: "globe",
      color: "#f97316",
      severity: "critical",
      summary: "Drop, Cover, Hold — then evacuate when shaking stops",
      steps: [
        "DROP to the ground immediately",
        "Take COVER under a sturdy desk or table",
        "HOLD ON until the shaking stops completely",
        "Stay away from windows, mirrors, and heavy objects",
        "After shaking stops, check for injuries and hazards",
        "Evacuate via stairwells — DO NOT use elevators",
        "Watch for aftershocks — be prepared to take cover again",
        "Proceed to the open-air Assembly Point at Heritage Garden",
        "Report any structural damage, gas smells, or injuries to staff",
      ],
      assemblyPoint: "Heritage Garden (open area, away from structures)",
      emergencyContact: "Hotel Security: EXT-100 | Emergency: 112",
      schematic: "/schematics/earthquake.png",
    },
    {
      id: "flood",
      title: "Flood & Cyclone",
      icon: "waves",
      color: "#3b82f6",
      severity: "high",
      summary: "Move to upper floors and avoid water-affected areas",
      steps: [
        "Move to Floor 2 or above immediately",
        "Avoid basement, parking, and ground floor during flooding",
        "Stay away from windows during cyclone winds",
        "Do NOT walk through flowing water — even shallow water can be dangerous",
        "If power is lost, remain in your room with the door closed",
        "Unplug electronic devices to prevent electrical hazards",
        "If trapped, signal for help from a window or call hotel security",
        "Keep emergency supplies: water bottle, phone, torch",
        "Wait for the all-clear announcement before returning to lower floors",
      ],
      assemblyPoint: "Tower Wing Floor 3 Corridor (interior safe zone)",
      emergencyContact: "Hotel Security: EXT-100 | Civil Defense: +91-22-22694725",
      schematic: "/schematics/flood.png",
    },
    {
      id: "medical",
      title: "Medical Emergency",
      icon: "heart-pulse",
      color: "#ec4899",
      severity: "high",
      summary: "Call for help immediately — hotel medical staff are on site",
      steps: [
        "Call Hotel Medical: EXT-300 or press the Emergency button in your room",
        "Describe the symptoms and patient's condition",
        "If unconscious, check for breathing and pulse",
        "If trained, begin CPR if no pulse (30 compressions : 2 breaths)",
        "If choking, perform the Heimlich maneuver",
        "Do NOT move the patient if spinal injury is suspected",
        "Collect any medications the patient is currently taking",
        "Stay with the patient until medical staff arrive",
        "AED devices are located at every floor's elevator lobby",
      ],
      assemblyPoint: "Not applicable — stay at patient's location",
      emergencyContact: "Hotel Medical: EXT-300 | Ambulance: 108 | Emergency: 112",
      schematic: "/schematics/medical.png",
    },
    {
      id: "security",
      title: "Security / Lockdown",
      icon: "lock",
      color: "#a855f7",
      severity: "critical",
      summary: "Lockdown procedures — secure yourself in your room",
      steps: [
        "Return to your room immediately",
        "Lock and deadbolt the door — use the security chain",
        "Turn off lights and stay away from the door",
        "Stay low and away from windows",
        "Keep your phone charged and on silent",
        "DO NOT open the door unless you can verify hotel security (ID badge through peephole)",
        "If you cannot reach your room, find the nearest locking room",
        "Follow PA announcements for instructions",
        "Do NOT attempt to leave the building during lockdown",
      ],
      assemblyPoint: "In-room shelter-in-place until all-clear",
      emergencyContact: "Hotel Security: EXT-100 | Police: 100 | Emergency: 112",
      schematic: "/schematics/security.png",
    },
  ];
}

// ============================================================
// FLOOR PLANS
// ============================================================

export function getFloorPlans() {
  return [
    {
      id: "basement",
      name: "Basement Level",
      floor: -1,
      areas: [
        { id: "parking", name: "Parking", x: 10, y: 20, w: 80, h: 40, type: "utility" },
        { id: "storage", name: "Storage", x: 10, y: 65, w: 35, h: 25, type: "utility" },
        { id: "mechanical", name: "Mechanical Room", x: 55, y: 65, w: 35, h: 25, type: "utility" },
      ],
      exits: [
        { x: 5, y: 40, label: "Ramp Exit A" },
        { x: 95, y: 40, label: "Ramp Exit B" },
      ],
      stairwells: [
        { x: 15, y: 60, label: "Stairwell W1" },
        { x: 85, y: 60, label: "Stairwell W2" },
      ],
      assemblyPoint: null,
    },
    {
      id: "ground",
      name: "Ground Floor",
      floor: 0,
      areas: [
        { id: "lobby_main", name: "Main Lobby", x: 30, y: 10, w: 40, h: 25, type: "public" },
        { id: "reception", name: "Reception", x: 35, y: 38, w: 30, h: 10, type: "service" },
        { id: "sea_lounge", name: "Sea Lounge", x: 5, y: 10, w: 22, h: 35, type: "restaurant" },
        { id: "masala_kraft", name: "Masala Kraft", x: 73, y: 10, w: 22, h: 35, type: "restaurant" },
        { id: "pool_spa", name: "Pool & Spa", x: 5, y: 55, w: 40, h: 35, type: "recreational" },
        { id: "terrace", name: "Gateway Terrace", x: 55, y: 55, w: 40, h: 35, type: "outdoor" },
      ],
      exits: [
        { x: 50, y: 3, label: "Main Entrance" },
        { x: 5, y: 50, label: "Side Exit W" },
        { x: 95, y: 50, label: "Side Exit E" },
        { x: 50, y: 97, label: "Terrace Exit" },
      ],
      stairwells: [
        { x: 20, y: 48, label: "Stairwell W1" },
        { x: 80, y: 48, label: "Stairwell E1" },
        { x: 50, y: 48, label: "Stairwell C" },
      ],
      assemblyPoint: { x: 75, y: 80, label: "Assembly Point A — Gateway Terrace" },
    },
    {
      id: "floor1",
      name: "Floor 1",
      floor: 1,
      areas: [
        { id: "ballroom", name: "Crystal Ballroom", x: 10, y: 10, w: 45, h: 40, type: "event" },
        { id: "conf_a", name: "Conference A", x: 60, y: 10, w: 30, h: 18, type: "meeting" },
        { id: "conf_b", name: "Conference B", x: 60, y: 32, w: 30, h: 18, type: "meeting" },
        { id: "rooms_1", name: "Guest Rooms 101-120", x: 10, y: 55, w: 80, h: 35, type: "rooms" },
      ],
      exits: [
        { x: 5, y: 50, label: "Fire Exit W" },
        { x: 95, y: 50, label: "Fire Exit E" },
      ],
      stairwells: [
        { x: 15, y: 52, label: "Stairwell W1" },
        { x: 85, y: 52, label: "Stairwell E1" },
        { x: 50, y: 52, label: "Stairwell C" },
      ],
      assemblyPoint: null,
    },
    {
      id: "floor2",
      name: "Floor 2",
      floor: 2,
      areas: [
        { id: "gym", name: "Fitness Center", x: 10, y: 10, w: 25, h: 25, type: "recreational" },
        { id: "business", name: "Business Center", x: 40, y: 10, w: 20, h: 25, type: "service" },
        { id: "lounge", name: "Executive Lounge", x: 65, y: 10, w: 25, h: 25, type: "public" },
        { id: "rooms_2", name: "Guest Rooms 201-230", x: 10, y: 40, w: 80, h: 50, type: "rooms" },
      ],
      exits: [
        { x: 5, y: 45, label: "Fire Exit W" },
        { x: 95, y: 45, label: "Fire Exit E" },
      ],
      stairwells: [
        { x: 15, y: 38, label: "Stairwell W1" },
        { x: 85, y: 38, label: "Stairwell E1" },
        { x: 50, y: 38, label: "Stairwell C" },
      ],
      assemblyPoint: null,
    },
    {
      id: "floor3",
      name: "Floor 3",
      floor: 3,
      areas: [
        { id: "rooms_3", name: "Guest Rooms 301-340", x: 10, y: 10, w: 80, h: 80, type: "rooms" },
      ],
      exits: [
        { x: 5, y: 50, label: "Fire Exit W" },
        { x: 95, y: 50, label: "Fire Exit E" },
      ],
      stairwells: [
        { x: 15, y: 50, label: "Stairwell W1" },
        { x: 85, y: 50, label: "Stairwell E1" },
        { x: 50, y: 50, label: "Stairwell C" },
      ],
      assemblyPoint: null,
    },
  ];
}

// ============================================================
// GUEST ALERTS
// ============================================================

/**
 * Filter active incidents relevant to a guest's zone.
 */
export function getGuestAlerts(token, activeIncidents) {
  const session = activeSessions.get(token);
  if (!session) return [];

  const guestZone = session.currentZone;
  const zoneName = ZONES.find((z) => z.id === guestZone)?.name || "";

  // Return alerts that match zone or are facility-wide (Critical tier)
  return activeIncidents
    .filter((inc) => {
      if (inc.status !== "Active") return false;
      if (inc.tier === "Critical") return true; // All Critical alerts shown
      const incLoc = (inc.location || "").toLowerCase();
      return incLoc.includes(zoneName.toLowerCase()) || incLoc.includes("general");
    })
    .map((inc) => ({
      id: inc.id,
      type: inc.hazardType,
      tier: inc.tier,
      location: inc.location,
      description: inc.rawDescription,
      explanation: inc.explanation,
      recommendedActions: inc.recommendedActions,
      timestamp: inc.timestamp,
      score: inc.score ?? inc.finalPriority ?? 0,
    }))
    .slice(0, 10);
}

/**
 * Get all active sessions (for admin/dashboard).
 */
export function getActiveGuestSessions() {
  const sessions = [];
  for (const [token, session] of activeSessions) {
    sessions.push({
      guestId: session.guest.id,
      room: session.guest.room,
      name: `${session.guest.firstName} ${session.guest.lastName}`,
      currentZone: session.currentZone,
      zoneName: ZONES.find((z) => z.id === session.currentZone)?.name || session.currentZone,
      loginAt: session.loginAt,
      vip: session.guest.vip,
    });
  }
  return sessions;
}
