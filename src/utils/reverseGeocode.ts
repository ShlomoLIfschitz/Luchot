// src/utils/reverseGeocode.ts
// Nominatim reverse-geocode helper — shared by NoteEditor and any future caller.

export async function reverseGeocodeNominatim(lat: number, lng: number): Promise<string> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=he`,
      { headers: { 'User-Agent': 'Luchot-App/1.0' }, signal: controller.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return '';
    const data = await res.json();
    const a = data.address ?? {};
    const parts = [
      a.amenity ?? a.shop ?? a.tourism,
      a.road,
      a.suburb ?? a.neighbourhood,
      a.city ?? a.town ?? a.village ?? a.county,
    ].filter(Boolean);
    return parts.join(', ');
  } catch {
    return '';
  }
}
