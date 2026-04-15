// ============================================================
// DISPATCH ENGINE — Autonomous Incident Routing + Voice Calls
// ============================================================
// Automatically routes scored incidents to the correct authorities
// based on tier, domain, and autonomy level.
//
// NEW — v2 Enhancements:
//   • Immediate employee/security personnel deployment
//   • Pre-recorded voice scripts auto-transmitted to authority lines
//   • Call tracking with status (initiated → connected → delivered)
//   • Zone-based personnel assignment
//
// Autonomy Levels:
//   A3 (Auto-Protect) → Full external + internal auto-dispatch + voice calls
//   A2 (Dispatch)     → Internal teams + relevant external + voice calls
//   A1 (Notify Staff) → Hotel teams notification only (internal calls)
//   A0 (Log Only)     → Audit trail, no dispatch
//
// Domain → Authority Mapping:
//   Medical           → EMS/Ambulance + Hotel Medical
//   Hazard (Fire)     → Fire Dept + Hotel Security + Engineering
//   Hazard (Flood)    → Civil Defense + Hotel Engineering
//   Infrastructure    → Hotel Security + Engineering
//   Security          → Police + Hotel Security
// ============================================================

// ── Authority Definitions ─────────────────────────────────

const AUTHORITIES = {
  fire_department: {
    id: "fire_department",
    name: "Mumbai Fire Brigade",
    type: "external",
    phone: "+91-22-23076111",
    email: "fire@mcgm.gov.in",
    responseTimeMin: 8,
  },
  police: {
    id: "police",
    name: "Colaba Police Station",
    type: "external",
    phone: "+91-22-22841454",
    email: "ps.colaba@mahapolice.gov.in",
    responseTimeMin: 10,
  },
  ems: {
    id: "ems",
    name: "Emergency Medical Services",
    type: "external",
    phone: "108",
    email: "ems@maharashtra.gov.in",
    responseTimeMin: 12,
  },
  civil_defense: {
    id: "civil_defense",
    name: "Mumbai Civil Defense",
    type: "external",
    phone: "+91-22-22694725",
    email: "civildefense@mumbai.gov.in",
    responseTimeMin: 15,
  },
  hotel_security: {
    id: "hotel_security",
    name: "Hotel Security Team",
    type: "internal",
    phone: "EXT-100",
    email: "security@tajhotels.com",
    responseTimeMin: 2,
  },
  hotel_engineering: {
    id: "hotel_engineering",
    name: "Hotel Engineering",
    type: "internal",
    phone: "EXT-200",
    email: "engineering@tajhotels.com",
    responseTimeMin: 5,
  },
  hotel_medical: {
    id: "hotel_medical",
    name: "Hotel Medical Staff",
    type: "internal",
    phone: "EXT-300",
    email: "medical@tajhotels.com",
    responseTimeMin: 3,
  },
  hotel_management: {
    id: "hotel_management",
    name: "Hotel Management",
    type: "internal",
    phone: "EXT-001",
    email: "management@tajhotels.com",
    responseTimeMin: 5,
  },
};

// ── On-Duty Personnel Roster ──────────────────────────────
// Simulated staff roster. In production, this would query an HR/scheduling system.

const PERSONNEL_ROSTER = {
  security: [
    { id: "SEC-01", name: "Rajesh Kumar", role: "Security Supervisor", zone: "Main Lobby", phone: "EXT-101", onDuty: true },
    { id: "SEC-02", name: "Amit Sharma", role: "Security Officer", zone: "Palace Wing", phone: "EXT-102", onDuty: true },
    { id: "SEC-03", name: "Priya Patel", role: "Security Officer", zone: "Tower Wing", phone: "EXT-103", onDuty: true },
    { id: "SEC-04", name: "Vikram Singh", role: "Security Officer", zone: "Pool & Terrace", phone: "EXT-104", onDuty: true },
    { id: "SEC-05", name: "Neha Desai", role: "CCTV Operator", zone: "Control Room", phone: "EXT-105", onDuty: true },
    { id: "SEC-06", name: "Suresh Patil", role: "Security Officer", zone: "Basement", phone: "EXT-106", onDuty: false },
  ],
  engineering: [
    { id: "ENG-01", name: "Ravi Menon", role: "Chief Engineer", zone: "Engineering Bay", phone: "EXT-201", onDuty: true },
    { id: "ENG-02", name: "Anand Joshi", role: "Electrical", zone: "Tower Wing", phone: "EXT-202", onDuty: true },
    { id: "ENG-03", name: "Deepak Verma", role: "Fire Systems", zone: "Main Building", phone: "EXT-203", onDuty: true },
    { id: "ENG-04", name: "Kiran Rao", role: "HVAC/Plumbing", zone: "Basement", phone: "EXT-204", onDuty: true },
  ],
  medical: [
    { id: "MED-01", name: "Dr. Anjali Shah", role: "Duty Doctor", zone: "Medical Bay", phone: "EXT-301", onDuty: true },
    { id: "MED-02", name: "Nurse Rekha", role: "Duty Nurse", zone: "Medical Bay", phone: "EXT-302", onDuty: true },
    { id: "MED-03", name: "Nurse Sanjay", role: "First Aid", zone: "Pool & Spa", phone: "EXT-303", onDuty: true },
  ],
  management: [
    { id: "MGR-01", name: "Arjun Nair", role: "Duty Manager", zone: "Front Office", phone: "EXT-001", onDuty: true },
    { id: "MGR-02", name: "Meera Deshmukh", role: "General Manager", zone: "Admin Office", phone: "EXT-002", onDuty: true },
  ],
};

// ── Pre-Recorded Voice Message Scripts ────────────────────
// These messages are transmitted via automated calls when dispatching to authorities.
// In production, these would be TTS-generated audio files or IVR recordings.

const VOICE_SCRIPTS = {
  // ─── External Authority Scripts ───
  fire_hazard: {
    targetAuthority: "fire_department",
    scriptId: "VS-FIRE-001",
    language: "en",
    durationSec: 18,
    transcript:
      "This is an automated emergency alert from Taj Hotel Mumbai, Apollo Bunder, Colaba. " +
      "A fire emergency has been detected at the hotel. " +
      "Smoke and flame indicators have been confirmed by automated sensors. " +
      "Hotel evacuation protocols are underway. " +
      "Immediate fire brigade response is requested. " +
      "Contact the hotel command center at 022-6665-3366 for live coordination. " +
      "Repeating: Fire emergency at Taj Hotel Mumbai. Immediate response requested.",
  },
  fire_hazard_hi: {
    targetAuthority: "fire_department",
    scriptId: "VS-FIRE-001-HI",
    language: "hi",
    durationSec: 20,
    transcript:
      "Yeh Taj Hotel Mumbai, Apollo Bunder, Colaba se ek automated emergency alert hai. " +
      "Hotel mein aag ki emergency detect hui hai. " +
      "Automated sensors ne dhuaan aur aag ki pushti ki hai. " +
      "Hotel mein evacuation shuru ho chuka hai. " +
      "Fire brigade ki turant madad chahiye. " +
      "Hotel command center se sampark karein: 022-6665-3366.",
  },

  medical_emergency: {
    targetAuthority: "ems",
    scriptId: "VS-MED-001",
    language: "en",
    durationSec: 16,
    transcript:
      "This is an automated emergency alert from Taj Hotel Mumbai, Apollo Bunder, Colaba. " +
      "A medical emergency has been reported at the hotel. " +
      "On-site hotel medical staff are administering first aid. " +
      "Ambulance dispatch is requested for patient transport. " +
      "Contact the hotel medical desk at EXT-300 or command center at 022-6665-3366 for patient details. " +
      "Repeating: Medical emergency at Taj Hotel Mumbai. Ambulance requested.",
  },

  security_threat: {
    targetAuthority: "police",
    scriptId: "VS-SEC-001",
    language: "en",
    durationSec: 15,
    transcript:
      "This is an automated security alert from Taj Hotel Mumbai, Apollo Bunder, Colaba. " +
      "A security threat has been identified at the hotel premises. " +
      "Hotel security has initiated lockdown protocols. " +
      "Police assistance is requested immediately. " +
      "Contact the hotel security command at 022-6665-3366 for live situation briefing. " +
      "Repeating: Security incident at Taj Hotel Mumbai. Police response requested.",
  },

  flood_cyclone: {
    targetAuthority: "civil_defense",
    scriptId: "VS-FLOOD-001",
    language: "en",
    durationSec: 16,
    transcript:
      "This is an automated emergency alert from Taj Hotel Mumbai, Apollo Bunder, Colaba. " +
      "Flooding or severe weather conditions have been detected endangering the hotel and guests. " +
      "Water ingress has been confirmed by building sensors. " +
      "Civil defense coordination is requested for evacuation support. " +
      "Contact the hotel command center at 022-6665-3366. " +
      "Repeating: Flood emergency at Taj Hotel Mumbai. Civil defense assistance requested.",
  },

  earthquake: {
    targetAuthority: "civil_defense",
    scriptId: "VS-QUAKE-001",
    language: "en",
    durationSec: 16,
    transcript:
      "This is an automated seismic emergency alert from Taj Hotel Mumbai, Apollo Bunder, Colaba. " +
      "Seismic activity has been detected. Structural assessment is underway. " +
      "Guests are being guided to safe zones. " +
      "Civil defense and emergency services coordination is requested. " +
      "Contact the hotel command center at 022-6665-3366. " +
      "Repeating: Earthquake alert at Taj Hotel Mumbai.",
  },

  // ─── Internal Staff Scripts ───
  internal_fire: {
    targetAuthority: "hotel_security",
    scriptId: "VS-INT-FIRE-001",
    language: "en",
    durationSec: 12,
    transcript:
      "ATTENTION ALL SECURITY PERSONNEL. Code Red — Fire emergency detected. " +
      "Initiate evacuation protocol for the affected zone immediately. " +
      "Secure all exits and guide guests to assembly points. " +
      "Report to your zone supervisor for deployment orders. This is not a drill.",
  },
  internal_medical: {
    targetAuthority: "hotel_medical",
    scriptId: "VS-INT-MED-001",
    language: "en",
    durationSec: 10,
    transcript:
      "PRIORITY MEDICAL ALERT. A medical emergency has been reported. " +
      "Duty doctor and nursing staff deploy to the incident location immediately. " +
      "Bring emergency medical kit and AED. Prepare for possible ambulance handoff.",
  },
  internal_security: {
    targetAuthority: "hotel_security",
    scriptId: "VS-INT-SEC-001",
    language: "en",
    durationSec: 12,
    transcript:
      "ATTENTION ALL SECURITY PERSONNEL. Code Blue — Security threat identified. " +
      "Initiate lockdown protocol. Secure all entry and exit points. " +
      "All officers move to assigned defensive positions. " +
      "Hold guests in safe rooms until all-clear is issued. This is not a drill.",
  },
  internal_flood: {
    targetAuthority: "hotel_engineering",
    scriptId: "VS-INT-FLOOD-001",
    language: "en",
    durationSec: 10,
    transcript:
      "ENGINEERING EMERGENCY. Water ingress detected. " +
      "Deploy all available engineers to isolate water sources. " +
      "Activate sump pumps and shut non-essential water mains. " +
      "Security team: relocate guests from affected lower floors.",
  },
  internal_general: {
    targetAuthority: "hotel_security",
    scriptId: "VS-INT-GEN-001",
    language: "en",
    durationSec: 8,
    transcript:
      "ATTENTION STAFF. An incident has been detected that requires immediate attention. " +
      "Security and engineering teams respond to the incident zone. " +
      "Await further instructions from the duty manager.",
  },
};

// ── Domain → Authority Routing Rules ──────────────────────

const DOMAIN_ROUTING = {
  medical: {
    A3: ["ems", "hotel_medical", "hotel_security", "hotel_management"],
    A2: ["hotel_medical", "hotel_security", "ems"],
    A1: ["hotel_medical", "hotel_security"],
    A0: [],
  },
  hazard: {
    A3: ["fire_department", "hotel_security", "hotel_engineering", "hotel_management"],
    A2: ["hotel_security", "hotel_engineering", "fire_department"],
    A1: ["hotel_security", "hotel_engineering"],
    A0: [],
  },
  hazard_flood: {
    A3: ["civil_defense", "hotel_engineering", "hotel_security", "hotel_management"],
    A2: ["hotel_engineering", "hotel_security", "civil_defense"],
    A1: ["hotel_engineering", "hotel_security"],
    A0: [],
  },
  hazard_earthquake: {
    A3: ["civil_defense", "fire_department", "hotel_security", "hotel_engineering", "hotel_management"],
    A2: ["hotel_security", "hotel_engineering", "civil_defense"],
    A1: ["hotel_security", "hotel_engineering"],
    A0: [],
  },
  infrastructure_crowd: {
    A3: ["hotel_security", "hotel_engineering", "police", "hotel_management"],
    A2: ["hotel_security", "hotel_engineering"],
    A1: ["hotel_security"],
    A0: [],
  },
  security: {
    A3: ["police", "hotel_security", "hotel_management"],
    A2: ["hotel_security", "police"],
    A1: ["hotel_security"],
    A0: [],
  },
};

// ── Dispatch State ────────────────────────────────────────

let dispatchLog = [];
let activeDispatches = new Map(); // incidentId → dispatch record
let callLog = [];                  // all outgoing voice calls
let personnelDeployments = [];     // all personnel deployment records

// ── Helpers ───────────────────────────────────────────────

function genDispatchId() {
  return "DSP-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
}

function genCallId() {
  return "CALL-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 3).toUpperCase();
}

function genDeployId() {
  return "DEP-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 3).toUpperCase();
}

/**
 * Determine the specific routing key based on domain and hazard type.
 */
function getRoutingKey(domain, hazardType) {
  const ht = (hazardType || "").toLowerCase();

  if (domain === "medical") return "medical";

  if (ht.includes("security") || ht.includes("threat") || ht.includes("suspicious")) {
    return "security";
  }

  if (domain === "hazard") {
    if (ht.includes("flood") || ht.includes("water") || ht.includes("cyclone") || ht.includes("storm")) {
      return "hazard_flood";
    }
    if (ht.includes("earthquake") || ht.includes("seismic")) {
      return "hazard_earthquake";
    }
    return "hazard";
  }

  return "infrastructure_crowd";
}

/**
 * Select the correct voice script based on routing key and authority.
 */
function selectVoiceScript(routingKey, authorityId) {
  const authority = AUTHORITIES[authorityId];
  if (!authority) return null;

  const isExternal = authority.type === "external";

  if (isExternal) {
    // External authority voice scripts
    if (routingKey === "hazard" || routingKey.includes("fire")) return VOICE_SCRIPTS.fire_hazard;
    if (routingKey === "medical") return VOICE_SCRIPTS.medical_emergency;
    if (routingKey === "security") return VOICE_SCRIPTS.security_threat;
    if (routingKey === "hazard_flood") return VOICE_SCRIPTS.flood_cyclone;
    if (routingKey === "hazard_earthquake") return VOICE_SCRIPTS.earthquake;
    return VOICE_SCRIPTS.fire_hazard; // fallback
  } else {
    // Internal staff voice scripts
    if (routingKey === "hazard") return VOICE_SCRIPTS.internal_fire;
    if (routingKey === "medical") return VOICE_SCRIPTS.internal_medical;
    if (routingKey === "security") return VOICE_SCRIPTS.internal_security;
    if (routingKey === "hazard_flood") return VOICE_SCRIPTS.internal_flood;
    if (routingKey === "hazard_earthquake") return VOICE_SCRIPTS.internal_fire;
    return VOICE_SCRIPTS.internal_general;
  }
}

/**
 * Simulate initiating a voice call to an authority.
 * In production, this would integrate with Twilio/Exotel/telephony API.
 */
function initiateVoiceCall(authority, voiceScript, incident, dispatchId) {
  const call = {
    id: genCallId(),
    dispatchId,
    incidentId: incident.id,
    authorityId: authority.id,
    authorityName: authority.name,
    authorityType: authority.type,
    phone: authority.phone,
    scriptId: voiceScript.scriptId,
    scriptLanguage: voiceScript.language,
    scriptDurationSec: voiceScript.durationSec,
    transcript: voiceScript.transcript,
    status: "initiated",       // initiated → ringing → connected → delivered → failed
    initiatedAt: new Date().toISOString(),
    connectedAt: null,
    deliveredAt: null,
    failedAt: null,
    retryCount: 0,
    maxRetries: 3,
  };

  callLog.push(call);

  // Simulate call progression (for demo — in production uses telephony webhooks)
  setTimeout(() => {
    call.status = "ringing";
    console.log(`  📞 RINGING: ${authority.name} (${authority.phone})`);
  }, 500);

  setTimeout(() => {
    call.status = "connected";
    call.connectedAt = new Date().toISOString();
    console.log(`  📞 CONNECTED: ${authority.name} — playing voice message [${voiceScript.scriptId}]`);
  }, 2000);

  setTimeout(() => {
    call.status = "delivered";
    call.deliveredAt = new Date().toISOString();
    console.log(`  ✅ DELIVERED: Voice message to ${authority.name} (${voiceScript.durationSec}s script played)`);
  }, 2000 + voiceScript.durationSec * 100); // Accelerated for demo

  return call;
}

/**
 * Deploy on-duty personnel to the incident zone.
 * Selects nearest available staff based on incident type and location.
 */
function deployPersonnel(incident, routingKey) {
  const deployments = [];
  const incidentZone = incident.location || "Unknown";
  const tier = incident.tier || "Low";

  // Determine which personnel categories to deploy
  const categoriesToDeploy = [];

  // Security is ALWAYS deployed for any incident
  categoriesToDeploy.push("security");

  if (routingKey === "medical") {
    categoriesToDeploy.push("medical");
  }
  if (routingKey === "hazard" || routingKey === "hazard_flood" || routingKey === "hazard_earthquake") {
    categoriesToDeploy.push("engineering");
  }
  if (tier === "Critical" || tier === "High") {
    categoriesToDeploy.push("management");
  }

  // Deduplicate
  const uniqueCategories = [...new Set(categoriesToDeploy)];

  for (const category of uniqueCategories) {
    const roster = PERSONNEL_ROSTER[category] || [];
    const onDutyStaff = roster.filter((p) => p.onDuty);

    // Sort by proximity — staff in the same zone get priority
    const sorted = [...onDutyStaff].sort((a, b) => {
      const aMatch = a.zone.toLowerCase().includes(incidentZone.toLowerCase().split(" ")[0]) ? 0 : 1;
      const bMatch = b.zone.toLowerCase().includes(incidentZone.toLowerCase().split(" ")[0]) ? 0 : 1;
      return aMatch - bMatch;
    });

    // Deploy based on severity
    const deployCount = tier === "Critical" ? sorted.length : tier === "High" ? Math.min(2, sorted.length) : 1;

    for (let i = 0; i < deployCount; i++) {
      const person = sorted[i];
      if (!person) break;

      const deployment = {
        id: genDeployId(),
        incidentId: incident.id,
        personnelId: person.id,
        name: person.name,
        role: person.role,
        category,
        fromZone: person.zone,
        toZone: incidentZone,
        phone: person.phone,
        status: "dispatched",       // dispatched → en_route → on_scene → stood_down
        dispatchedAt: new Date().toISOString(),
        arrivedAt: null,
        order: buildDeploymentOrder(incident, person, routingKey),
      };

      deployments.push(deployment);
    }
  }

  personnelDeployments.push(...deployments);
  return deployments;
}

/**
 * Build a specific deployment order/instruction for a staff member.
 */
function buildDeploymentOrder(incident, person, routingKey) {
  const location = incident.location || "incident zone";
  const hazard = incident.hazardType || "incident";

  const orders = {
    security: {
      hazard: `DEPLOY to ${location}. Evacuate guests from the affected zone. Secure perimeter and direct evacuees to nearest assembly point. Report crowd count to command.`,
      medical: `DEPLOY to ${location}. Secure the scene for medical response. Clear a path for medical staff and stretcher. Control crowd and ensure privacy.`,
      security: `DEPLOY to ${location}. High alert — potential security threat. Secure all entry/exit points to the zone. Hold and observe until police arrival. Do not engage alone.`,
      hazard_flood: `DEPLOY to ${location}. Assist engineering team with guest relocation from affected floors. Secure stairwells and elevators. Direct guests upward.`,
      hazard_earthquake: `DEPLOY to ${location}. Check for structural damage. Guide guests away from glass and heavy fixtures. Prepare for aftershocks. Report damage assessment.`,
      infrastructure_crowd: `DEPLOY to ${location}. Manage crowd flow and prevent bottlenecks. Establish queuing lanes if needed. Report capacity status.`,
    },
    engineering: {
      hazard: `DEPLOY to ${location}. Assess fire suppression systems. Verify sprinkler activation and HVAC smoke containment. Isolate electrical circuits in the affected zone.`,
      hazard_flood: `DEPLOY to ${location}. Activate sump pumps. Shut water mains to affected area. Assess structural water damage. Deploy sandbags at ground-level entry points.`,
      hazard_earthquake: `DEPLOY to ${location}. Immediate structural assessment required. Check load-bearing walls, pillars, and foundations. Shut gas mains as precaution.`,
      infrastructure_crowd: `DEPLOY to ${location}. Check HVAC, lighting, and elevator systems for the affected zone. Ensure backup power readiness.`,
    },
    medical: {
      medical: `DEPLOY to ${location} with emergency medical kit and AED. Assess patient, stabilize, and prepare for ambulance handoff. Report patient vitals to command.`,
      hazard: `STANDBY at Medical Bay with trauma kit. Prepare for potential burn/smoke inhalation casualties from ${location}.`,
    },
    management: {
      _default: `ALERT: ${hazard} at ${location}. Coordinate with command center. Prepare guest communication and media holding statement. Authorize resource allocation.`,
    },
  };

  const categoryOrders = orders[person.role.toLowerCase().includes("security") || person.role.toLowerCase().includes("cctv") ? "security" :
    person.role.toLowerCase().includes("engineer") || person.role.toLowerCase().includes("electrical") || person.role.toLowerCase().includes("hvac") || person.role.toLowerCase().includes("fire sys") ? "engineering" :
    person.role.toLowerCase().includes("doctor") || person.role.toLowerCase().includes("nurse") || person.role.toLowerCase().includes("first aid") ? "medical" :
    "management"];

  if (!categoryOrders) return `DEPLOY to ${location}. Respond to ${hazard}. Await further instructions from duty manager.`;

  return categoryOrders[routingKey] || categoryOrders._default || `DEPLOY to ${location}. Respond to ${hazard}. Follow standard operating procedures.`;
}

/**
 * Generate action descriptions for authorities based on incident.
 */
function buildDispatchActions(incident, authorityIds, routingKey) {
  const actions = [];

  for (const authId of authorityIds) {
    const authority = AUTHORITIES[authId];
    if (!authority) continue;

    let actionType = "notification";
    let urgency = "normal";
    let message = "";

    if (incident.autonomyLevel === "A3") {
      actionType = "auto_dispatch";
      urgency = "critical";
    } else if (incident.autonomyLevel === "A2") {
      actionType = "auto_dispatch";
      urgency = "high";
    }

    // Build context-appropriate message
    const score = incident.score ?? incident.finalPriority ?? 0;
    const location = incident.location || "Unknown Location";
    const hazard = incident.hazardType || "Unknown Hazard";

    if (authority.type === "external") {
      message = `EMERGENCY DISPATCH — ${hazard} at Taj Hotel Mumbai, ${location}. Priority Score: ${score}/10 (${incident.tier}). Immediate response required.`;
    } else {
      message = `ALERT — ${hazard} detected at ${location}. Priority: ${score}/10 (${incident.tier}). ${incident.autonomyLevel === "A3" ? "AUTO-PROTECTIVE ACTIONS INITIATED." : "Respond immediately."}`;
    }

    // Append recommended actions
    if (incident.recommendedActions && incident.recommendedActions.length > 0) {
      message += ` Actions: ${incident.recommendedActions.slice(0, 3).join("; ")}`;
    }

    // Select and attach voice script
    const voiceScript = selectVoiceScript(routingKey, authId);

    actions.push({
      authorityId: authId,
      authorityName: authority.name,
      authorityType: authority.type,
      phone: authority.phone,
      email: authority.email,
      actionType,
      urgency,
      message,
      estimatedResponseMin: authority.responseTimeMin,
      status: "pending",
      dispatchedAt: new Date().toISOString(),
      acknowledgedAt: null,
      // Voice call info
      voiceCall: voiceScript ? {
        scriptId: voiceScript.scriptId,
        language: voiceScript.language,
        durationSec: voiceScript.durationSec,
        status: "queued",           // queued → initiated → delivered
      } : null,
    });
  }

  return actions;
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Dispatch an incident to appropriate authorities.
 * Now includes: voice calls + personnel deployment.
 * Called automatically after incident scoring.
 * Returns the dispatch record.
 */
export function dispatchIncident(incident) {
  const autonomy = incident.autonomyLevel || "A0";
  const domain = incident.domain || "hazard";
  const routingKey = getRoutingKey(domain, incident.hazardType);

  // A0 = log only, no dispatch
  if (autonomy === "A0") {
    const logEntry = {
      id: genDispatchId(),
      incidentId: incident.id,
      timestamp: new Date().toISOString(),
      autonomyLevel: autonomy,
      tier: incident.tier,
      domain,
      routingKey,
      hazardType: incident.hazardType,
      location: incident.location,
      score: incident.score ?? incident.finalPriority ?? 0,
      actions: [],
      personnelDeployed: [],
      voiceCalls: [],
      status: "logged",
      summary: `Incident logged — no dispatch required (${autonomy})`,
    };
    dispatchLog.push(logEntry);
    return logEntry;
  }

  // Lookup routing
  const routing = DOMAIN_ROUTING[routingKey] || DOMAIN_ROUTING.infrastructure_crowd;
  const authorityIds = routing[autonomy] || routing.A1 || [];

  // Build dispatch actions
  const actions = buildDispatchActions(incident, authorityIds, routingKey);

  // ── 1. Deploy personnel immediately ──────────────────
  const deployedPersonnel = deployPersonnel(incident, routingKey);
  console.log(`[Dispatch] 👥 ${deployedPersonnel.length} personnel deployed to ${incident.location}`);
  for (const dep of deployedPersonnel) {
    console.log(`  → ${dep.name} (${dep.role}) [${dep.fromZone} → ${dep.toZone}]`);
  }

  // ── 2. Initiate voice calls to authorities ───────────
  const voiceCalls = [];
  for (const action of actions) {
    // Voice calls go out for A2 and A3 autonomy levels
    if (autonomy === "A3" || autonomy === "A2") {
      const voiceScript = selectVoiceScript(routingKey, action.authorityId);
      if (voiceScript) {
        const call = initiateVoiceCall(AUTHORITIES[action.authorityId], voiceScript, incident, null);
        voiceCalls.push(call);
        if (action.voiceCall) {
          action.voiceCall.callId = call.id;
          action.voiceCall.status = "initiated";
        }
      }
    } else if (autonomy === "A1") {
      // A1: internal voice calls only
      const authority = AUTHORITIES[action.authorityId];
      if (authority && authority.type === "internal") {
        const voiceScript = selectVoiceScript(routingKey, action.authorityId);
        if (voiceScript) {
          const call = initiateVoiceCall(authority, voiceScript, incident, null);
          voiceCalls.push(call);
          if (action.voiceCall) {
            action.voiceCall.callId = call.id;
            action.voiceCall.status = "initiated";
          }
        }
      }
    }
  }

  const dispatchRecord = {
    id: genDispatchId(),
    incidentId: incident.id,
    timestamp: new Date().toISOString(),
    autonomyLevel: autonomy,
    tier: incident.tier,
    domain,
    routingKey,
    hazardType: incident.hazardType,
    location: incident.location,
    score: incident.score ?? incident.finalPriority ?? 0,
    confidence: incident.confidence ?? 0,
    isCompound: incident.isCompound || false,
    actions,
    personnelDeployed: deployedPersonnel,
    voiceCalls: voiceCalls.map((c) => ({
      callId: c.id,
      authorityName: c.authorityName,
      phone: c.phone,
      scriptId: c.scriptId,
      status: c.status,
    })),
    status: "dispatched",
    summary: `${autonomy === "A3" ? "AUTO-PROTECT" : autonomy === "A2" ? "DISPATCHED" : "NOTIFIED"}: ${incident.hazardType} at ${incident.location} → ${authorityIds.map((id) => AUTHORITIES[id]?.name || id).join(", ")}`,
  };

  // Update call dispatch IDs
  for (const call of voiceCalls) {
    call.dispatchId = dispatchRecord.id;
  }

  // Store
  dispatchLog.push(dispatchRecord);
  activeDispatches.set(incident.id, dispatchRecord);

  // Console output for demo visibility
  const emoji = autonomy === "A3" ? "🚨" : autonomy === "A2" ? "📟" : "📢";
  console.log(`[Dispatch] ${emoji} ${dispatchRecord.summary}`);
  for (const action of actions) {
    console.log(`  → ${action.authorityName} (${action.actionType}) [${action.urgency}]${action.voiceCall ? ` 📞 Voice: ${action.voiceCall.scriptId}` : ""}`);
  }
  console.log(`  📞 ${voiceCalls.length} voice calls initiated | 👥 ${deployedPersonnel.length} personnel deployed`);

  return dispatchRecord;
}

/**
 * Acknowledge a dispatch action (mark as responded).
 */
export function acknowledgeDispatch(incidentId, authorityId) {
  const dispatch = activeDispatches.get(incidentId);
  if (!dispatch) return null;

  const action = dispatch.actions.find((a) => a.authorityId === authorityId);
  if (action) {
    action.status = "acknowledged";
    action.acknowledgedAt = new Date().toISOString();
  }

  // Check if all actions are acknowledged
  const allAcknowledged = dispatch.actions.every((a) => a.status === "acknowledged");
  if (allAcknowledged) {
    dispatch.status = "all_acknowledged";
  }

  return dispatch;
}

/**
 * Resolve a dispatch (all actions completed).
 */
export function resolveDispatch(incidentId) {
  const dispatch = activeDispatches.get(incidentId);
  if (!dispatch) return null;

  dispatch.status = "resolved";
  dispatch.resolvedAt = new Date().toISOString();

  // Stand down deployed personnel
  for (const dep of dispatch.personnelDeployed || []) {
    dep.status = "stood_down";
  }

  activeDispatches.delete(incidentId);
  return dispatch;
}

/**
 * Get the full dispatch audit log.
 */
export function getDispatchLog(limit = 50) {
  return dispatchLog.slice(-limit).reverse();
}

/**
 * Get all active (unresolved) dispatches.
 */
export function getActiveDispatches() {
  return Array.from(activeDispatches.values()).sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );
}

/**
 * Get a specific dispatch by incident ID.
 */
export function getDispatchByIncidentId(incidentId) {
  return activeDispatches.get(incidentId) || null;
}

/**
 * Get all authority definitions.
 */
export function getAuthorities() {
  return Object.values(AUTHORITIES);
}

/**
 * Get the voice call log.
 */
export function getCallLog(limit = 50) {
  return callLog.slice(-limit).reverse();
}

/**
 * Get all personnel deployment records.
 */
export function getPersonnelDeployments(limit = 50) {
  return personnelDeployments.slice(-limit).reverse();
}

/**
 * Get the on-duty personnel roster.
 */
export function getPersonnelRoster() {
  return PERSONNEL_ROSTER;
}

/**
 * Get voice script definitions (for UI display).
 */
export function getVoiceScripts() {
  return VOICE_SCRIPTS;
}
