/**
 * Temporal Awareness Utilities
 *
 * Provides human-readable time formatting for operational dashboards.
 * Focus: Operational clarity, not technical precision.
 */

/**
 * Converts a date to relative time in Dutch
 * Examples: "Nu", "2 min", "3 uur geleden", "Gisteren", "5 dagen geleden"
 */
export function getRelativeTime(date: Date | string, referenceNow?: number): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const now = referenceNow ?? Date.now();
  const diff = now - targetDate.getTime();

  // Future dates
  if (diff < 0) return 'Nu';

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  // < 1 minute
  if (minutes < 1) return 'Nu';

  // < 60 minutes
  if (minutes < 60) return `${minutes} min`;

  // < 6 hours - show "X uur geleden"
  if (hours < 6) return `${hours} uur geleden`;

  // Today - show "Vandaag om HH:MM"
  if (days === 0) {
    const hoursStr = String(targetDate.getHours()).padStart(2, '0');
    const minsStr = String(targetDate.getMinutes()).padStart(2, '0');
    return `Vandaag om ${hoursStr}:${minsStr}`;
  }

  // Yesterday - show "Gisteren om HH:MM"
  if (days === 1) {
    const hoursStr = String(targetDate.getHours()).padStart(2, '0');
    const minsStr = String(targetDate.getMinutes()).padStart(2, '0');
    return `Gisteren om ${hoursStr}:${minsStr}`;
  }

  // < 7 days
  if (days < 7) return `${days} dagen geleden`;

  // Older - show "DD MMM"
  const monthNames = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  const day = targetDate.getDate();
  const month = monthNames[targetDate.getMonth()];
  return `${day} ${month}`;
}

/**
 * Formats last update time for "Laatst bijgewerkt" labels
 * Examples: "zojuist", "2 min geleden", "1 uur geleden", "vandaag", "gisteren"
 */
export function getUpdateTime(lastUpdate: Date | string): string {
  const updateDate = typeof lastUpdate === 'string' ? new Date(lastUpdate) : lastUpdate;
  const diff = Date.now() - updateDate.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'zojuist';
  if (minutes < 60) return `${minutes} min geleden`;
  if (hours < 6) return `${hours} uur geleden`;
  if (days === 0) return 'vandaag';
  if (days === 1) return 'gisteren';
  return `${days} dagen geleden`;
}

/**
 * Formats urgency time for operational alerts
 * Examples: "48 uur zonder reactie", "3 dagen zonder actie"
 * Used for critical insights that need temporal emphasis
 */
export function getUrgencyTime(hours: number): string {
  if (hours < 24) return `${hours} uur zonder reactie`;

  const days = Math.floor(hours / 24);
  if (days === 1) return '1 dag zonder actie';
  if (days === 2) return '48 uur zonder reactie'; // Emphasize 48h
  return `${days} dagen zonder actie`;
}

/**
 * Get short timestamp for compact displays
 * Examples: "2m", "3u", "2d"
 */
export function getShortTime(date: Date | string): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const diff = Date.now() - targetDate.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'nu';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}u`;
  return `${days}d`;
}

/**
 * Check if a timestamp indicates staleness (needs refresh)
 * Returns true if data is older than threshold
 */
export function isStale(lastUpdate: Date | string, thresholdMinutes: number = 5): boolean {
  const updateDate = typeof lastUpdate === 'string' ? new Date(lastUpdate) : lastUpdate;
  const diff = Date.now() - updateDate.getTime();
  return diff > thresholdMinutes * 60000;
}
