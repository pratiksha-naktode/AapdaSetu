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
  const resource = (request.requested_resource || '').toLowerCase();
  const category = (request.category || '').toLowerCase();
  const desc = (request.description || '').toLowerCase();
  const text = `${resource} ${category} ${desc}`;

  if (request.request_type === 'RESOURCE') {
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
 * Available: +25
 * Distance <= 2 km: +20
 * Distance <= 5 km: +10
 * Distance > 5 km: +0
 * Existing active assignment: exclude candidate
 */
export function scoreCandidate({
  candidate,
  request,
  requiredType,
  requiredCapability,
  hasActiveAssignment = false
}) {
  const scoreBreakdown = {
    capability: 0,
    availability: 0,
    distance: 0
  };

  // Rule 5: Active assignment excludes candidate
  if (hasActiveAssignment || (candidate.active_assignments_count && candidate.active_assignments_count > 0)) {
    return {
      matching_score: 0,
      is_excluded: true,
      exclusion_reason: 'Active assignment already in progress',
      score_breakdown: scoreBreakdown,
      capability_match: false,
      distance_km: null
    };
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
  const totalScore = scoreBreakdown.capability + scoreBreakdown.availability + scoreBreakdown.distance;

  return {
    matching_score: totalScore,
    is_excluded: false,
    exclusion_reason: null,
    capability_match: capabilityMatch,
    partial_match: partialMatch,
    availability: isAvailable,
    distance_km: distanceKm,
    score_breakdown: scoreBreakdown
  };
}

/**
 * Compute intelligent matches for a disaster request against candidates.
 */
export function matchRequestCandidates(request, candidates = [], activeAssignmentsMap = {}) {
  const requiredType = determineRequiredResponderType(request);
  const requiredCapability = determineRequiredCapability(request);

  const scoredCandidates = candidates.map(cand => {
    const hasActive = Boolean(
      activeAssignmentsMap[cand.id] ||
      (cand.active_assignments_count && cand.active_assignments_count > 0)
    );

    const scoreResult = scoreCandidate({
      candidate: cand,
      request,
      requiredType,
      requiredCapability,
      hasActiveAssignment: hasActive
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
