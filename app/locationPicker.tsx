// app/locationPicker.tsx
// Phase 4.5 — Location picker screen. Lists curated cities grouped
// by country (Israel / International). User can also press a GPS
// button to use device location.
//
// Selecting a city or confirming GPS updates LocationProvider and
// pops back to the previous screen.

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Navigation, Search } from 'lucide-react-native';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useLocationStore } from '../src/providers/LocationProvider';
import { ScreenHeader } from '../src/components/common/ScreenHeader';
import { CITIES, type CityEntry } from '../src/constants/cities';
import { radius } from '../src/constants/radius';

export default function LocationPickerScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const currentKey       = useLocationStore((s) => s.cityHebcalKey);
  const setFromCity      = useLocationStore((s) => s.setLocationFromCity);

  const [query, setQuery]           = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);

  // Filter city list by Hebrew name or English key
  const filteredCities = useMemo(() => {
    const q = query.trim();
    if (!q) return CITIES;
    const lower = q.toLowerCase();
    return CITIES.filter(
      (c) =>
        c.nameHe.includes(q) ||
        c.hebcalKey.toLowerCase().includes(lower),
    );
  }, [query]);

  const israeli       = filteredCities.filter((c) => c.country === 'IL');
  const international = filteredCities.filter((c) => c.country === 'INTL');

  const handleUseGps = async () => {
    setGpsLoading(true);
    try {
      const result = await useLocationStore.getState().acquireFromDeviceGps();
      if (result.ok) {
        router.back();
        return;
      }
      switch (result.reason) {
        case 'servicesDisabled':
          Alert.alert(
            'שירותי מיקום כבויים',
            'הפעל את שירותי המיקום בהגדרות המכשיר כדי לחשב זמנים מדויקים.',
          );
          break;
        case 'permissionDenied':
          Alert.alert(
            'הרשאה נדרשת',
            'אשר גישה למיקום כדי לחשב זמנים מדויקים.',
          );
          break;
        case 'permissionBlocked':
          Alert.alert(
            'הרשאה חסומה',
            'הרשאת המיקום נחסמה. יש לאפשר אותה בהגדרות המערכת של המכשיר.',
          );
          break;
        case 'timeout':
          Alert.alert(
            'לא הצלחנו לקבל מיקום',
            'ניסיון קבלת המיקום ארך זמן רב מדי. נסה שוב.',
          );
          break;
        case 'error':
        default:
          Alert.alert('שגיאה', 'לא הצלחנו לקבל את המיקום שלך. נסה שוב.');
          break;
      }
    } finally {
      setGpsLoading(false);
    }
  };

  const handlePickCity = (hebcalKey: string) => {
    const ok = setFromCity(hebcalKey);
    if (ok) {
      router.back();
    } else {
      Alert.alert('שגיאה', 'לא הצלחנו לטעון את העיר הזו. נסה אחרת.');
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader title="בחר מיקום" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* GPS button */}
        <Pressable
          onPress={handleUseGps}
          disabled={gpsLoading}
          style={[styles.gpsButton, { backgroundColor: colors.accent }]}
          accessibilityLabel="השתמש במיקום הנוכחי"
        >
          {gpsLoading ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <>
              <Navigation size={18} color={colors.textInverse} />
              <Text style={[styles.gpsButtonText, { color: colors.textInverse }]}>
                השתמש במיקום הנוכחי
              </Text>
            </>
          )}
        </Pressable>

        {/* Search box */}
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Search size={16} color={colors.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="חפש עיר..."
            placeholderTextColor={colors.textTertiary}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            textAlign="right"
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        {/* Israeli cities */}
        {israeli.length > 0 && (
          <>
            <Text style={[styles.sectionHeader, { color: colors.accent }]}>
              ישראל
            </Text>
            <View style={[styles.card, { borderColor: colors.border }]}>
              {israeli.map((city, idx) => (
                <CityRow
                  key={city.hebcalKey + idx}
                  city={city}
                  isSelected={city.hebcalKey === currentKey}
                  isLast={idx === israeli.length - 1}
                  colors={colors}
                  onPress={() => handlePickCity(city.hebcalKey)}
                />
              ))}
            </View>
          </>
        )}

        {/* International cities */}
        {international.length > 0 && (
          <>
            <Text style={[styles.sectionHeader, { color: colors.accent }]}>
              חוץ לארץ
            </Text>
            <View style={[styles.card, { borderColor: colors.border }]}>
              {international.map((city, idx) => (
                <CityRow
                  key={city.hebcalKey + idx}
                  city={city}
                  isSelected={city.hebcalKey === currentKey}
                  isLast={idx === international.length - 1}
                  colors={colors}
                  onPress={() => handlePickCity(city.hebcalKey)}
                />
              ))}
            </View>
          </>
        )}

        {filteredCities.length === 0 && (
          <Text style={[styles.emptyState, { color: colors.textTertiary }]}>
            {`לא נמצאו תוצאות עבור "${query}"`}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

// ─── CityRow ───────────────────────────────────────────────────────────────────

function CityRow({
  city,
  isSelected,
  isLast,
  colors,
  onPress,
}: {
  city: CityEntry;
  isSelected: boolean;
  isLast: boolean;
  colors: ReturnType<typeof useThemeColors>;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: colors.border }}
      style={[
        styles.cityRow,
        { backgroundColor: colors.surface },
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <MapPin
        size={16}
        color={isSelected ? colors.accent : colors.textTertiary}
      />
      <Text
        style={[
          styles.cityName,
          { color: isSelected ? colors.accent : colors.textPrimary },
          isSelected && styles.cityNameSelected,
        ]}
      >
        {city.nameHe}
      </Text>
      {isSelected && (
        <Text style={[styles.checkmark, { color: colors.accent }]}>✓</Text>
      )}
    </Pressable>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:          { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  gpsButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.lg,
    marginBottom: 16,
    minHeight: 50,
  },
  gpsButtonText: { fontSize: 15, fontWeight: '600' },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
  },

  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 6,
    paddingHorizontal: 4,
    textAlign: 'right',
  },

  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },

  cityRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 12,
    minHeight: 50,
  },
  cityName: {
    flex: 1,
    fontSize: 15,
    textAlign: 'right',
  },
  cityNameSelected: {
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '700',
  },

  emptyState: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 32,
    fontStyle: 'italic',
  },
});
