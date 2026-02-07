export function formatTimeRemaining(endTime: string): {
  text: string;
  isExpired: boolean;
} {
  const end = new Date(endTime).getTime();
  const now = Date.now();
  const diff = end - now;

  if (diff <= 0) {
    return { text: "Completed!", isExpired: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (days > 0) {
    return { text: `${days}d ${hours}h ${minutes}m`, isExpired: false };
  }
  if (hours > 0) {
    return { text: `${hours}h ${minutes}m ${seconds}s`, isExpired: false };
  }
  if (minutes > 0) {
    return { text: `${minutes}m ${seconds}s`, isExpired: false };
  }
  return { text: `${seconds}s`, isExpired: false };
}

export function getTimerProgress(startTime: string, endTime: string): number {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const now = Date.now();

  if (now >= end) return 100;
  if (now <= start) return 0;

  return ((now - start) / (end - start)) * 100;
}

export function formatDuration(minutes: number): string {
  if (minutes >= 1440) {
    const days = Math.floor(minutes / 1440);
    const remainingHours = Math.floor((minutes % 1440) / 60);
    if (remainingHours === 0) return `${days}d`;
    return `${days}d ${remainingHours}h`;
  }
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    if (remainingMins === 0) return `${hours}h`;
    return `${hours}h ${remainingMins}m`;
  }
  return `${minutes}m`;
}
