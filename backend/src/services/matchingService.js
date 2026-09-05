/**
 * Haversine formula to compute great-circle distance between two points in kilometers.
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
    return 9999.0;
  }
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Match best responder for an emergency request based on responder type and proximity.
 */
export function matchResponders(request, responders) {
  const reqLat = Number(request.latitude);
  const reqLon = Number(request.longitude);
  const neededType = request.recommended_responder;

  return responders
    .map(responder => {
      const dist = calculateDistanceKm(reqLat, reqLon, Number(responder.latitude), Number(responder.longitude));
      const typeMatch = responder.responder_type === neededType;
      return {
        ...responder,
        distance_km: dist,
        is_type_match: typeMatch
      };
    })
    .sort((a, b) => {
      // Prioritize type match first, then closest distance
      if (a.is_type_match && !b.is_type_match) return -1;
      if (!a.is_type_match && b.is_type_match) return 1;
      return a.distance_km - b.distance_km;
    });
}

/**
 * Match best volunteers for a resource request based on capability and proximity.
 */
export function matchVolunteers(request, volunteers) {
  const reqLat = Number(request.latitude);
  const reqLon = Number(request.longitude);
  const resource = (request.requested_resource || request.category || '').toUpperCase();

  return volunteers
    .map(vol => {
      const dist = calculateDistanceKm(reqLat, reqLon, Number(vol.latitude), Number(vol.longitude));
      // Check capabilities
      const caps = (vol.capabilities || []).map(c => c.toUpperCase());
      let matchesCapability = false;

      if (resource.includes('MED') && caps.includes('MEDICINE')) matchesCapability = true;
      else if (resource.includes('WATER') && caps.includes('WATER')) matchesCapability = true;
      else if (resource.includes('FOOD') && caps.includes('FOOD')) matchesCapability = true;
      else if (resource.includes('FIRST') && caps.includes('FIRST_AID')) matchesCapability = true;
      else if (caps.includes('GENERAL_ASSISTANCE') || caps.includes('RESCUE_SUPPORT')) matchesCapability = true;

      return {
        ...vol,
        distance_km: dist,
        matches_capability: matchesCapability
      };
    })
    .sort((a, b) => {
      if (a.matches_capability && !b.matches_capability) return -1;
      if (!a.matches_capability && b.matches_capability) return 1;
      return a.distance_km - b.distance_km;
    });
}
