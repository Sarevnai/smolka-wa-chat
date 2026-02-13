// ========== BUSINESS HOURS ==========
// Check if current time is within configured business hours

export interface BusinessHoursConfig {
  start: string;
  end: string;
  days: number[];
  timezone: string;
}

/**
 * Check if current time is within business hours
 */
export function checkBusinessHours(businessHours: BusinessHoursConfig | null): boolean {
  if (!businessHours) {
    console.log('⚠️ Business hours not configured, defaulting to within hours');
    return true;
  }

  const now = new Date();
  
  // Timezone offset
  let timezoneOffset = 0;
  if (businessHours.timezone === 'America/Sao_Paulo') {
    timezoneOffset = -3;
  } else if (businessHours.timezone === 'America/New_York') {
    timezoneOffset = -5;
  }
  
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  let localHours = utcHours + timezoneOffset;
  
  let dayOffset = 0;
  if (localHours < 0) { localHours += 24; dayOffset = -1; }
  else if (localHours >= 24) { localHours -= 24; dayOffset = 1; }
  
  const utcDay = now.getUTCDay();
  let currentDay = utcDay + dayOffset;
  if (currentDay < 0) currentDay = 6;
  if (currentDay > 6) currentDay = 0;
  
  // Check day
  if (!businessHours.days.includes(currentDay)) {
    return false;
  }

  // Check time
  const [startHour, startMin] = businessHours.start.split(':').map(Number);
  const [endHour, endMin] = businessHours.end.split(':').map(Number);
  
  const currentTime = localHours * 60 + utcMinutes;
  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;

  return currentTime >= startTime && currentTime <= endTime;
}
