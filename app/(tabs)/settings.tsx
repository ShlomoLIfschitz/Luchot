import { View, Text, Switch, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import * as Location from 'expo-location';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useSettingsStore } from '../../src/providers/SettingsProvider';
import { useCalendarStore } from '../../src/providers/CalendarProvider';
import { useLocationStore } from '../../src/providers/LocationProvider';

export default function SettingsScreen() {
  const colors = useThemeColors();
  const {
    showHebrew,
    showGregorian,
    hebrewOnTop,
    diaspora,
    use24hTime,
    toggleHebrew,
    toggleGregorian,
    toggleHebrewOnTop,
    setDiaspora: setSettingsDiaspora,
  } = useSettingsStore();

  const calendarSetDiaspora = useCalendarStore((s) => s.setDiaspora);
  const setLocation = useLocationStore((s) => s.setLocation);

  const onUseDeviceLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('הרשאה נדרשת', 'אשר גישה למיקום בהגדרות המכשיר כדי לחשב זמנים מדויקים.');
      return;
    }
    const pos = await Location.getCurrentPositionAsync({});
    setLocation(pos.coords.latitude, pos.coords.longitude);
    Alert.alert('מיקום עודכן', 'זמני היום מחושבים לפי המיקום הנוכחי.');
  };

  const onDiasporaChange = (v: boolean) => {
    setSettingsDiaspora(v);
    calendarSetDiaspora(v);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>הגדרות</Text>

      <View style={styles.row}>
        <Text style={{ color: colors.textPrimary }}>עברית</Text>
        <Switch value={showHebrew} onValueChange={toggleHebrew} />
      </View>
      <View style={styles.row}>
        <Text style={{ color: colors.textPrimary }}>לועזי</Text>
        <Switch value={showGregorian} onValueChange={toggleGregorian} />
      </View>
      <View style={styles.row}>
        <Text style={{ color: colors.textPrimary }}>עברית למעלה</Text>
        <Switch value={hebrewOnTop} onValueChange={toggleHebrewOnTop} />
      </View>
      <Pressable style={styles.row} onPress={onUseDeviceLocation}>
        <Text style={{ color: colors.accent }}>📍 עדכן מיקום לזמנים (GPS)</Text>
      </Pressable>
      <View style={styles.row}>
        <Text style={{ color: colors.textPrimary }}>תפוצות (חגים)</Text>
        <Switch value={diaspora} onValueChange={onDiasporaChange} />
      </View>
      <View style={styles.row}>
        <Text style={{ color: colors.textPrimary }}>שעה 24</Text>
        <Switch
          value={use24hTime}
          onValueChange={(v) => {
            useSettingsStore.setState({ use24hTime: v });
            useSettingsStore.getState().save('use24hTime', String(v));
          }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
});
