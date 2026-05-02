import { View, StyleSheet } from 'react-native';
import { DayView } from '../../src/components/calendar/DayView';

export default function DayScreen() {
  return (
    <View style={styles.root}>
      <DayView />
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
