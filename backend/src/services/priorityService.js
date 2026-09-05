import { config } from '../config.js';

export async function calculatePriority(requestData) {
  const payload = {
    request_type: requestData.request_type || 'emergency',
    category: requestData.category || 'general',
    people_count: Number(requestData.people_count || 1),
    child_present: Boolean(requestData.child_present),
    elderly_present: Boolean(requestData.elderly_present),
    injured: Boolean(requestData.injured),
    medical_emergency: Boolean(requestData.medical_emergency),
    trapped: Boolean(requestData.trapped),
    life_threat: Boolean(requestData.life_threat),
    requested_resource: requestData.requested_resource || null,
    damage_severity: requestData.damage_severity || null,
    additional_notes: requestData.description || ''
  };

  try {
    const response = await fetch(`${config.fastApiUrl}/priority/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3500)
    });

    if (response.ok) {
      const data = await response.json();
      if (data && typeof data.score === 'number' && data.priority && data.reason) {
        return {
          priority_score: data.score,
          priority_level: data.priority,
          priority_reason: data.reason,
          recommended_responder: data.recommended_responder || (payload.request_type === 'emergency' ? 'RESCUE_TEAM' : 'VOLUNTEER'),
          factors_breakdown: data.factors_breakdown || {}
        };
      }
    } else {
      console.warn(`[PriorityService] FastAPI returned HTTP ${response.status}: ${response.statusText}. Using fallback rule engine.`);
    }
  } catch (err) {
    console.warn(`[PriorityService] FastAPI Priority Engine at ${config.fastApiUrl} unavailable or timed out (${err.message}). Using fallback rule engine.`);
  }

  // Resilient fallback rule evaluation
  return evaluateRuleFallback(payload);
}

function evaluateRuleFallback(req) {
  let score = req.request_type === 'emergency' ? 60 : 30;
  const reasons = [];

  if (req.trapped) { score += 20; reasons.push("people are trapped"); }
  if (req.life_threat) { score += 20; reasons.push("there is an immediate life threat"); }
  if (req.medical_emergency) { score += 20; reasons.push("urgent medical emergency is reported"); }
  if (req.injured) { score += 15; reasons.push("injured individuals require urgent care"); }
  if (req.child_present) { score += 10; reasons.push("children are present"); }
  if (req.elderly_present) { score += 10; reasons.push("elderly persons need rescue"); }
  if (req.people_count > 1) { score += 10; reasons.push(`${req.people_count} people affected`); }

  if (req.requested_resource) {
    const r = req.requested_resource.toLowerCase();
    if (r.includes("med")) { score += 20; reasons.push("essential medicine required"); }
    else if (r.includes("water")) { score += 15; reasons.push("drinking water required"); }
    else if (r.includes("food")) { score += 10; reasons.push("food required"); }
  }

  const finalScore = Math.max(0, Math.min(100, score));
  let level = 'LOW';
  if (finalScore >= 80) level = 'CRITICAL';
  else if (finalScore >= 60) level = 'HIGH';
  else if (finalScore >= 40) level = 'MEDIUM';

  let recommended = 'VOLUNTEER';
  if (req.trapped || req.life_threat) recommended = 'RESCUE_TEAM';
  else if (req.medical_emergency || req.injured) recommended = 'MEDICAL_TEAM';
  else if (req.request_type === 'emergency') recommended = 'POLICE';

  const reasonStr = reasons.length > 0 
    ? `${level} — ${reasons.join(', ')}.`
    : `${level} — Standard priority level.`;

  return {
    priority_score: finalScore,
    priority_level: level,
    priority_reason: reasonStr,
    recommended_responder: recommended,
    factors_breakdown: { fallback: true, calculated_score: finalScore }
  };
}
