const MS_PER_HOUR = 1000 * 60 * 60;

export const calculateWorkedHoursExcludingLunch = (
  timeIn: Date,
  timeOut: Date
): number => {
  const grossMs = timeOut.getTime() - timeIn.getTime();
  if (grossMs <= 0) return 0;

  const lunchStart = new Date(timeIn);
  lunchStart.setHours(12, 0, 0, 0);

  const lunchEnd = new Date(timeIn);
  lunchEnd.setHours(13, 0, 0, 0);

  const overlapStart = Math.max(timeIn.getTime(), lunchStart.getTime());
  const overlapEnd = Math.min(timeOut.getTime(), lunchEnd.getTime());
  const overlapMs = Math.max(0, overlapEnd - overlapStart);

  const workedMs = Math.max(0, grossMs - overlapMs);
  return Number((workedMs / MS_PER_HOUR).toFixed(2));
};
