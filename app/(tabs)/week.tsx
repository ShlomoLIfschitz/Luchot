import { View, StyleSheet } from 'react-native';
import { WeekRow } from '../../src/components/calendar/WeekRow';

export default function WeekScreen() {
  return (
    <View style={styles.root}>
      <WeekRow />
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
