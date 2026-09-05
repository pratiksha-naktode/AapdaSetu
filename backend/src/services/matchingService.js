/**
 * Intelligent Responder & Volunteer Matching Service (Rule-Based Engine)
 * Aligned with Step 8 requirements.
 */

/**
 * Haversine formula to compute great-circle distance between two points in kilometers.
 * Handles missing or invalid coordinates gracefully without crashing or using fake data.
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined ||
      lat1 === null || lon1 === null || lat2 === null || lon2 === null ||
      isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    return null;
  }
  const R = 6371; // Earth's radius in km
  const dLat = (Number(lat2) - Number(lat1)) * (Math.PI / 180);
  const dLon = (Number(lon2) - Number(lon1)) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(Number(lat1) * (Math.PI / 180)) *
      Math.cos(Number(lat2) * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * 1. Determine required responder type.
 * Emergency request: → Police / Rescue Team / Medical Team / Fire Services
 * Resource request: → Volunteer
 */
export function determineRequiredResponderType(request) {
  if (request.request_type === 'RESOURCE') {
    return 'VOLUNTEER';
  }

  // If already computed by FastAPI Priority Engine
  if (request.recommended_responder) {
    return request.recommended_responder.toUpperCase();
  }

  const category = (request.category || '').toLowerCase();
  const desc = (request.description || '').toLowerCase();

  if (category.includes('trapped') || desc.includes('trapped') || desc.includes('roof') || desc.includes('flood')) {
    return 'RESCUE_TEAM';
  }
  if (category.includes('medical') || request.injured || request.medical_emergency || desc.includes('injured')) {
    return 'MEDICAL_TEAM';
  }
  if (category.includes('fire') || desc.includes('fire') || desc.includes('gas')) {
    return 'FIRE_SERVICES';
  }
  return 'POLICE';
}

/**
 * 2. Determine required capability.
 * FOOD → FOOD
 * WATER → WATER
 * MEDICINE → MEDICINE
 * FIRST AID → FIRST_AID
 * TRANSPORT → TRANSPORTATION
 * GENERAL HELP → GENERAL_ASSISTANCE
 * Emergency rescue → RESCUE_SUPPORT
 */
export function determineRequiredCapability(request) {
  const explicitResource = (request.requested_resource || '').toUpperCase();
  if (['FOOD', 'WATER', 'MEDICINE', 'FIRST_AID', 'TRANSPORTATION', 'GENERAL_ASSISTANCE', 'RESCUE_SUPPORT'].includes(explicitResource)) {
    return explicitResource;
  }

  const resource = (request.requested_resource || '').toLowerCase();
  const category = (request.category || '').toLowerCase();
  const desc = (request.description || '').toLowerCase();
  const text = `${resource} ${category} ${desc}`;

  if (request.request_type === 'RESOURCE' || request.requested_resource || category.includes('food') || category.includes('water') || category.includes('med') || category.includes('supply')) {
    if (text.includes('med') || text.includes('insulin') || text.includes('drug') || text.includes('tablet')) {
      return 'MEDICINE';
    }
    if (text.includes('water') || text.includes('drink')) {
      return 'WATER';
    }
    if (text.includes('food') || text.includes('meal') || text.includes('ration') || text.includes('biscuit') || text.includes('baby')) {
      return 'FOOD';
    }
    if (text.includes('first_aid') || text.includes('first aid') || text.includes('bandage') || text.includes('antiseptic')) {
      return 'FIRST_AID';
    }
    if (text.includes('transport') || text.includes('vehicle') || text.includes('boat') || text.includes('evac')) {
      return 'TRANSPORTATION';
    }
    return 'GENERAL_ASSISTANCE';
  }

  // Emergency requests
  if (request.trapped || text.includes('trapped') || text.includes('rescue')) {
    return 'RESCUE_SUPPORT';
  }
  if (request.injured || request.medical_emergency || text.includes('medical') || text.includes('doctor')) {
    return 'FIRST_AID';
  }
  return 'RESCUE_SUPPORT';
}

/**
 * 5. Transparent Rule-Based Scoring Engine
 * Capability match: +50 (or +25 for partial/general assistance)
 * Availability: +25
 * Workload: +15 (0 tasks), +10 (1-2 tasks), +5 (3 tasks), Excluded (>= 4 tasks)
 * Distance <= 2 km: +20
 * Distance <= 5 km: +10
 * Distance > 5 km: +0
 */
export function scoreCandidate({
  candidate,
  request,
  requiredType,
  requiredCapability,
  activeTasksCount = 0
}) {
  const scoreBreakdown = {
    capability: 0,
    availability: 0,
    workload: 0,
    distance: 0
  };

  // Rule: Maximum 4 active tasks per volunteer/responder
  const totalActive = activeTasksCount || candidate.active_assignments_count || 0;
  if (totalActive >= 4) {
    return {
      matching_score: 0,
      is_excluded: true,
      exclusion_reason: 'Active task limit reached (4/4)',
      score_breakdown: scoreBreakdown,
      capability_match: false,
      distance_km: null
    };
  }

  // Workload scoring (fewer active tasks rewarded)
  if (totalActive === 0) {
    scoreBreakdown.workload = 15;
  } else if (totalActive <= 2) {
    scoreBreakdown.workload = 10;
  } else {
    scoreBreakdown.workload = 5;
  }

  // 1. Capability Matching (+50 full, +25 partial)
  let capabilityMatch = false;
  let partialMatch = false;

  if (requiredType === 'VOLUNTEER') {
    const caps = (candidate.capabilities || []).map(c => c.toUpperCase());
    if (caps.includes(requiredCapability.toUpperCase())) {
      capabilityMatch = true;
      scoreBreakdown.capability = 50;
    } else if (caps.includes('GENERAL_ASSISTANCE') || caps.includes('RESCUE_SUPPORT')) {
      partialMatch = true;
      scoreBreakdown.capability = 25;
    }
  } else {
    // Responder matching
    const candType = (candidate.responder_type || candidate.type || '').toUpperCase();
    if (candType === requiredType.toUpperCase()) {
      capabilityMatch = true;
      scoreBreakdown.capability = 50;
    } else if (candType === 'POLICE' || candType === 'RESCUE_TEAM') {
      partialMatch = true;
      scoreBreakdown.capability = 25;
    }
  }

  // 2. Availability (+25)
  const isAvailable = candidate.is_available !== false;
  if (isAvailable) {
    scoreBreakdown.availability = 25;
  }

  // 3. Distance Scoring (<= 2km: +20, <= 5km: +10, > 5km: +0)
  const reqLat = Number(request.latitude);
  const reqLon = Number(request.longitude);
  const candLat = Number(candidate.latitude);
  const candLon = Number(candidate.longitude);
  const distanceKm = calculateDistanceKm(reqLat, reqLon, candLat, candLon);

  if (distanceKm !== null) {
    if (distanceKm <= 2.0) {
      scoreBreakdown.distance = 20;
    } else if (distanceKm <= 5.0) {
      scoreBreakdown.distance = 10;
    } else {
      scoreBreakdown.distance = 0;
    }
  }

  // Total matching score
  const totalScore = scoreBreakdown.capability + scoreBreakdown.availability + scoreBreakdown.workload + scoreBreakdown.distance;

  return {
    matching_score: totalScore,
    is_excluded: false,
    exclusion_reason: null,
    capability_match: capabilityMatch,
    partial_match: partialMatch,
    availability: isAvailable,
    distance_km: distanceKm,
    active_tasks: totalActive,
    score_breakdown: scoreBreakdown
  };
}

/**
 * Intelligent Automatic Volunteer Assignment for RESOURCE requests.
 * Evaluates capability compatibility, availability, 4-task workload limit, and real GPS distance.
 */
export function findBestVolunteerForResourceRequest(request, volunteers = [], activeAssignmentsMap = {}) {
  const requiredCapability = determineRequiredCapability(request);
  const reqLat = Number(request.latitude);
  const reqLon = Number(request.longitude);

  const evaluated = volunteers.map(vol => {
    const activeTasks = activeAssignmentsMap[vol.id] || activeAssignmentsMap[vol.user_id] || vol.active_tasks || vol.activeTasks || 0;
    const caps = (vol.capabilities || []).map(c => c.toUpperCase());
    
    const isExactMatch = caps.includes(requiredCapability.toUpperCase());
    const isGeneralMatch = caps.includes('GENERAL_ASSISTANCE') || caps.includes('RESCUE_SUPPORT');
    const hasCapability = isExactMatch || isGeneralMatch;

    const isAvailable = vol.is_available !== false;
    const candLat = Number(vol.latitude);
    const candLon = Number(vol.longitude);
    const distanceKm = calculateDistanceKm(reqLat, reqLon, candLat, candLon);
    const isOverloaded = activeTasks >= 4;

    return {
      volunteer: vol,
      id: vol.id,
      name: vol.name || vol.full_name || 'Volunteer',
      phone: vol.phone || '',
      isAvailable,
      activeTasks,
      isOverloaded,
      isExactMatch,
      isGeneralMatch,
      hasCapability,
      distanceKm,
      hasValidLocation: distanceKm !== null
    };
  });

  // Filter candidates who meet capability, are available, have valid GPS, and are under 4 tasks
  const eligible = evaluated.filter(c => c.hasCapability && c.isAvailable && !c.isOverloaded && c.hasValidLocation);

  // Sorting Priority:
  // 1. Exact capability match first
  // 2. Active tasks count ascending (fewer active tasks prioritized)
  // 3. Distance ascending (closer prioritized)
  eligible.sort((a, b) => {
    if (a.isExactMatch && !b.isExactMatch) return -1;
    if (!a.isExactMatch && b.isExactMatch) return 1;
    if (a.activeTasks !== b.activeTasks) return a.activeTasks - b.activeTasks;
    return (a.distanceKm || 9999) - (b.distanceKm || 9999);
  });

  if (eligible.length > 0) {
    const best = eligible[0];
    const matchTypeStr = best.isExactMatch ? `Exact ${requiredCapability} match` : `General relief match`;
    
    // Check if a closer volunteer was excluded due to 4 tasks limit
    const closerOverloaded = evaluated.find(c => 
      c.hasCapability && 
      c.isAvailable && 
      c.isOverloaded && 
      c.distanceKm !== null && 
      best.distanceKm !== null && 
      c.distanceKm < best.distanceKm
    );

    let explanation = '';
    if (closerOverloaded) {
      explanation = `Nearest volunteer (${closerOverloaded.name}, ${closerOverloaded.distanceKm} km) excluded because active task limit reached (4/4). Auto-assigned to next nearest eligible candidate ${best.name} (${matchTypeStr}, ${best.distanceKm} km, ${best.activeTasks}/4 active tasks).`;
    } else {
      explanation = `AUTO — NEAREST AVAILABLE VOLUNTEER: Assigned to ${best.name} (${matchTypeStr}, ${best.distanceKm} km distance, ${best.activeTasks}/4 active tasks).`;
    }

    return {
      volunteer: best.volunteer,
      bestVolunteer: best.volunteer,
      explanation,
      distance_km: best.distanceKm,
      active_tasks: best.activeTasks,
      skippedBusyCount: evaluated.filter(c => c.isOverloaded).length,
      is_assigned: true
    };
  }

  // If no candidate is eligible, check if workload limit is the cause
  const matchingOverloaded = evaluated.filter(c => c.hasCapability && c.isAvailable && c.isOverloaded);
  let explanation = '';
  if (matchingOverloaded.length > 0) {
    explanation = 'No available volunteer within current workload limit (All eligible nearby volunteers are at maximum capacity: 4/4 active tasks).';
  } else {
    explanation = `PENDING — NO AVAILABLE VOLUNTEER (No active volunteers found with ${requiredCapability} capability in sector).`;
  }

  return {
    volunteer: null,
    bestVolunteer: null,
    explanation,
    distance_km: null,
    active_tasks: null,
    skippedBusyCount: matchingOverloaded.length,
    is_assigned: false
  };
}

/**
 * Compute intelligent matches for a disaster request against candidates.
 */
export function matchRequestCandidates(request, candidates = [], activeAssignmentsMap = {}) {
  const requiredType = determineRequiredResponderType(request);
  const requiredCapability = determineRequiredCapability(request);

  const scoredCandidates = candidates.map(cand => {
    const activeTasksCount = activeAssignmentsMap[cand.id] || activeAssignmentsMap[cand.user_id] || cand.active_assignments_count || 0;

    const scoreResult = scoreCandidate({
      candidate: cand,
      request,
      requiredType,
      requiredCapability,
      activeTasksCount
    });

    return {
      id: cand.id,
      name: cand.name || cand.full_name || 'Personnel',
      role: cand.role || (requiredType === 'VOLUNTEER' ? 'VOLUNTEER' : 'RESPONDER'),
      type: cand.responder_type || (requiredType === 'VOLUNTEER' ? 'VOLUNTEER' : 'RESCUE_TEAM'),
      capabilities: cand.capabilities || [],
      vehicle_type: cand.vehicle_type || null,
      availability: scoreResult.availability,
      distance_km: scoreResult.distance_km,
      capability_match: scoreResult.capability_match,
      partial_match: scoreResult.partial_match,
      is_excluded: scoreResult.is_excluded,
      exclusion_reason: scoreResult.exclusion_reason,
      matching_score: scoreResult.matching_score,
      score_breakdown: scoreResult.score_breakdown
    };
  });

  // Rank candidates:
  // 1. Non-excluded first
  // 2. Highest matching_score
  // 3. Tie-breaker: closest distance_km
  const ranked = scoredCandidates.sort((a, b) => {
    if (!a.is_excluded && b.is_excluded) return -1;
    if (a.is_excluded && !b.is_excluded) return 1;
    if (b.matching_score !== a.matching_score) {
      return b.matching_score - a.matching_score;
    }
    // Tie breaker on distance
    const distA = a.distance_km !== null ? a.distance_km : 9999;
    const distB = b.distance_km !== null ? b.distance_km : 9999;
    return distA - distB;
  });

  // Recommended candidate: highest score > 0 that is not excluded
  const topCandidate = ranked.find(c => !c.is_excluded && c.matching_score > 0) || null;
  const hasValidLocation = Boolean(
    request.latitude != null && 
    request.longitude != null && 
    Number(request.latitude) !== 0 && 
    Number(request.longitude) !== 0
  );

  let message = '';
  if (!hasValidLocation) {
    message = 'Location is unavailable; distance-based matching cannot be performed.';
  } else if (topCandidate) {
    message = `Recommended ${topCandidate.name} (Score: ${topCandidate.matching_score}/95)`;
  } else {
    message = 'No suitable available responder found.';
  }

  return {
    request_id: request.id,
    request_type: request.request_type,
    category: request.category,
    priority_level: request.priority_level,
    priority_score: request.priority_score,
    recommended_type: requiredType,
    required_capability: requiredCapability,
    has_location: hasValidLocation,
    distance_matching_available: hasValidLocation,
    candidates: ranked,
    recommended_candidate: topCandidate,
    candidate_count: ranked.length,
    status: topCandidate ? 'MATCH_FOUND' : 'NO_SUITABLE_AVAILABLE_RESPONDER_FOUND',
    message
  };
}

// Backwards-compatible exports for existing route imports
export function matchResponders(request, responders) {
  const result = matchRequestCandidates(request, responders);
  return result.candidates;
}

export function matchVolunteers(request, volunteers) {
  const result = matchRequestCandidates(request, volunteers);
  return result.candidates;
}
