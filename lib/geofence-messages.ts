/**
 * Human-friendly copy when the student is outside the geofence.
 */
export function geofenceOutOfRangeMessage(
  distanceMeters: number,
  radiusMeters: number,
  placeName = "campus",
): string {
  const place = placeName.trim() || "campus";
  const dist = Math.round(distanceMeters);
  const radius = Math.round(radiusMeters);

  if (dist > 5_000 || dist > radius * 20) {
    return `You're very far from ${place}. Please get within range of campus to check in.`;
  }

  if (dist > radius * 3) {
    return `You're still outside ${place}. Move closer — you need to be within about ${radius}m of campus.`;
  }

  if (dist > radius) {
    return `Almost there! You're about ${dist}m away. Step within ${radius}m of ${place}.`;
  }

  return `Please move within ${radius}m of ${place} to continue.`;
}

/** Map legacy API error strings to friendly text on the client. */
export function softenGeofenceApiError(
  error: string,
  placeName = "campus",
): string {
  const match = error.match(
    /You are ([\d.]+)m from .+ Must be within ([\d.]+)m/i,
  );
  if (match) {
    return geofenceOutOfRangeMessage(
      Number(match[1]),
      Number(match[2]),
      placeName,
    );
  }
  if (error.toLowerCase().includes("from the site")) {
    return `You're very far from ${placeName}. Please get within range of campus.`;
  }
  return error;
}

/** Friendly distance hint before check-in. */
export function distancePreviewMessage(
  distanceMeters: number,
  placeName: string,
  inRange: boolean,
): string {
  const place = placeName.trim() || "campus";
  const dist = Math.round(distanceMeters);
  if (dist > 5_000) {
    return `You're very far from ${place}. Move closer to check in.`;
  }
  if (inRange) {
    return `You're within range of ${place} (~${dist} m).`;
  }
  return `You're ~${dist} m from ${place}. Move within the campus area to check in.`;
}

export function gpsAccuracyHint(accuracyMeters: number | null): string | null {
  if (accuracyMeters == null) return null;
  const a = Math.round(accuracyMeters);
  if (a > 100) {
    return "GPS is weak — turn on precise location for a better fix.";
  }
  if (a > 50) {
    return `Location accuracy ~${a} m — move outdoors if check-in fails.`;
  }
  return null;
}
