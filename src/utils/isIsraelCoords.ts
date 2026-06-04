// src/utils/isIsraelCoords.ts
// Returns true when coordinates fall inside the Israel bounding box (lat 29–33, lon 34–36).

export function isIsraelCoords(lat: number, lng: number): boolean {
  return lat >= 29 && lat <= 33 && lng >= 34 && lng <= 36;
}
