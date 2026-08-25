export type GeoPosition = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

export type GeoErrorCode =
  | "unsupported"
  | "denied"
  | "unavailable"
  | "timeout"
  | "unknown";

/**
 * `standalone` = running installed (no visible browser chrome/address bar),
 * so "browser settings" would be confusing — point at the device's own
 * Settings app instead, where the permission actually lives.
 */
export function geolocationErrorMessage(
  code: GeoErrorCode,
  standalone = false,
): string {
  switch (code) {
    case "unsupported":
      return "This browser does not support location. Try Chrome or Safari on your phone.";
    case "denied":
      return standalone
        ? "Location permission is off. Open your phone's Settings app, find this app, and allow Location, then try again."
        : "Location permission is off. Allow location for this site in browser settings, then try again.";
    case "unavailable":
      return "GPS could not get a fix. Go outdoors, turn on Location Services, disable VPN, and try again. (A Google network-location warning in the console is normal and can be ignored if GPS works.)";
    case "timeout":
      return "Location timed out. Move to an open area and try again.";
    default:
      return "Could not read your location. Try again or use Wi‑Fi/mobile data with location enabled.";
  }
}

function mapError(code: number): GeoErrorCode {
  switch (code) {
    case 1:
      return "denied";
    case 2:
      return "unavailable";
    case 3:
      return "timeout";
    default:
      return "unknown";
  }
}

function readPosition(position: GeolocationPosition): GeoPosition {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy ?? null,
  };
}

function getPosition(options: PositionOptions): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(readPosition(p)),
      (e) => reject({ code: mapError(e.code), raw: e.message }),
      options,
    );
  });
}

/**
 * Tries high-accuracy GPS first, then a faster fallback.
 * Ignores benign Chrome "Network location provider googleapis 403" console noise
 * when the device still returns coordinates.
 */
export async function getDevicePosition(): Promise<GeoPosition> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw { code: "unsupported" as GeoErrorCode };
  }

  const attempts: PositionOptions[] = [
    { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    { enableHighAccuracy: false, timeout: 25_000, maximumAge: 60_000 },
  ];

  let lastCode: GeoErrorCode = "unknown";

  for (const options of attempts) {
    try {
      return await getPosition(options);
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? (err.code as GeoErrorCode)
          : "unknown";
      lastCode = code;
      if (code === "denied" || code === "unsupported") break;
    }
  }

  throw { code: lastCode };
}
