import { TIME_MS as t } from '../constants/timeConstants.js';

export function formatRelativeTimestamp(timestamp: string | Date): string {
  const date = new Date(timestamp);
  const now = new Date();

  const todayMidnight = new Date(now);
  todayMidnight.setHours(0, 0, 0, 0);

  const messageMidnight = new Date(date);
  messageMidnight.setHours(0, 0, 0, 0);

  const daysDiff = Math.floor(
    (todayMidnight.getTime() - messageMidnight.getTime()) / t.ONE_DAY
  );

  const timeString = date.toLocaleString('default', {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (daysDiff === 0) {
    return timeString;
  } else if (daysDiff === 1) {
    return `Yesterday at ${timeString}`;
  } else {
    const dateString = date.toLocaleString('default', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
    });
    return `${dateString} ${timeString}`;
  }
}
