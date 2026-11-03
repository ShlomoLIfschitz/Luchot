// src/components/drawer/Drawer.tsx
// Hamburger drawer — slides in from the LEFT when isOpen is true.
// The hamburger button is on the left side of the screen header,
// so the drawer slides from the same side for visual consistency.
// Built from scratch using react-native-reanimated 3 + GestureDetector.
// No new npm dependencies.
//
// Layout logic:
//   translateX:  0           = open  (panel at left edge, fully visible)
//   translateX: -drawerWidth = closed (panel off-screen to the left)
//   Swipe LEFT to close, swipe RIGHT (back) snaps to open.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import type { ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import {
  CalendarArrowUp,
  Calendar,
  BookOpenText,
  Sun,
  CalendarRange,
  Clock,
  Library,
  MapPin,
  Settings as SettingsIcon,
  Info,
  Heart,
} from 'lucide-react-native';
import { useDrawerStore } from '../../providers/DrawerProvider';
import { useThemeColors } from '../../hooks/useThemeColors';
import { overlay } from '../../constants/overlay';
import { typography, withFontFamily } from '../../constants/typography';
import { elevation } from '../../constants/elevation';
import { dateService, toHebrewNumeral, toHebrewYear } from '../../services/DateService';
import { DrawerItem } from './DrawerItem';
import { ExportModal } from '../export/ExportModal';

// App version — read from app.json via expo-constants (read-only; app.json
// itself is sensitive config, not edited here).
const APP_VERSION = Constants.expoConfig?.version ?? '';

// Fixed panel width per the approved visual design; clamped only as a safety
// net on unusually narrow screens so the backdrop never fully disappears.
const DRAWER_FIXED_WIDTH = 300;
const DRAWER_MIN_BACKDROP_MARGIN = 24;
const ANIMATION_DURATION = 250;
const SWIPE_CLOSE_VELOCITY = 400;
const SWIPE_CLOSE_DISTANCE = 60;

export function Drawer() {
  const colors = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const drawerWidth = Math.min(DRAWER_FIXED_WIDTH, screenWidth - DRAWER_MIN_BACKDROP_MARGIN);

  const isOpen = useDrawerStore((s) => s.isOpen);
  const closeDrawer = useDrawerStore((s) => s.close);

  // Fix 1: guard against screenWidth === 0 on Android first render.
  // If screenWidth is 0, drawerWidth is 0 and -drawerWidth would be 0 (open).
  // Use -1000 as a safe off-screen sentinel when dimensions are not yet known.
  const translateX = useSharedValue(screenWidth > 0 ? -drawerWidth : -1000);
  const backdropOpacity = useSharedValue(0);

  // Fix 2: capture position at gesture start so onUpdate uses deltas from
  // the actual starting point, not from zero. This prevents the "alternates
  // sides" bug that occurs when a previous gesture left translateX at a
  // non-zero value (e.g. the drawer was mid-animation when the next gesture started).
  const gestureStartX = useSharedValue(0);

  useEffect(() => {
    if (drawerWidth === 0) return;
    if (isOpen) {
      translateX.value = withTiming(0, { duration: ANIMATION_DURATION });
      backdropOpacity.value = withTiming(1, { duration: ANIMATION_DURATION });
    } else {
      translateX.value = withTiming(-drawerWidth, { duration: ANIMATION_DURATION });
      backdropOpacity.value = withTiming(0, { duration: ANIMATION_DURATION });
    }
  }, [isOpen, drawerWidth, translateX, backdropOpacity]);

  const animatedDrawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  // Fix 3: replace state + setTimeout with useAnimatedProps so pointer-events
  // toggle on the UI thread in sync with the animation. The old approach using
  // setState + setTimeout was unreliable on real Android (batching differences
  // vs Expo Go caused the backdrop to remain non-interactive after opening, or
  // stay interactive after closing).
  const backdropAnimatedProps = useAnimatedProps<Pick<ViewProps, 'pointerEvents'>>(() => ({
    pointerEvents: backdropOpacity.value > 0 ? 'auto' : 'none',
  }));

  const [exportModalVisible, setExportModalVisible] = useState(false);

  // All hooks have now been called unconditionally. Safe to return null here
  // if dimensions are not yet available (screenWidth === 0 on Android first render).
  if (screenWidth === 0) return null;

  // Swipe-to-close: drag the panel to the LEFT (back toward the screen edge).
  // Fix 2: .onStart captures the current translateX so onUpdate applies a true
  // delta rather than treating e.translationX as an absolute position.
  // runOnJS is required because Zustand setters run on the JS thread,
  // not on the Reanimated worklet thread.
  const triggerClose = () => { closeDrawer(); };

  const swipeGesture = Gesture.Pan()
    .onStart(() => {
      gestureStartX.value = translateX.value;
    })
    .onUpdate((e) => {
      const newX = gestureStartX.value + e.translationX;
      if (newX < 0) {
        translateX.value = newX;
        backdropOpacity.value = Math.max(0, 1 - Math.abs(newX) / drawerWidth);
      }
    })
    .onEnd((e) => {
      const shouldClose =
        e.velocityX < -SWIPE_CLOSE_VELOCITY ||    // fast leftward flick
        e.translationX < -SWIPE_CLOSE_DISTANCE;   // dragged far enough left
      if (shouldClose) {
        runOnJS(triggerClose)();
      } else {
        // Snap back to open
        translateX.value = withTiming(0, { duration: ANIMATION_DURATION });
        backdropOpacity.value = withTiming(1, { duration: ANIMATION_DURATION });
      }
    });

  // Close drawer then navigate. The 100ms delay lets the close animation
  // begin before the route transition fires, which feels smoother.
  const navigateTo = (path: string) => {
    closeDrawer();
    setTimeout(() => router.push(path as any), 100);
  };

  const today = new Date();
  const gregLabel = today.toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const heToday = dateService.getDayData(today).hebrewDate;
  const hebLabel = `${toHebrewNumeral(heToday.day)} ${heToday.monthName} ${toHebrewYear(heToday.year ?? today.getFullYear() + 3760)}`;

  return (
    <>
      {/* Backdrop — tappable to close, non-interactive when drawer is closed.
          Fix 3: pointerEvents driven by animatedProps (UI thread) instead of
          React state + setTimeout (unreliable on real Android). */}
      <Animated.View
        style={[
          styles.backdrop,
          { backgroundColor: overlay.modal },
          animatedBackdropStyle,
        ]}
        animatedProps={backdropAnimatedProps}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
      </Animated.View>

      {/* Drawer panel — anchored to left edge, slides in/out */}
      <GestureDetector gesture={swipeGesture}>
        <Animated.View
          style={[
            elevation.lg,
            styles.drawer,
            {
              width: drawerWidth,
              backgroundColor: colors.surface,
              shadowColor: colors.textPrimary,
            },
            animatedDrawerStyle,
          ]}
        >
          {/* Header — accent block, app name + today's date (Hebrew + Gregorian) */}
          <View
            style={[
              styles.header,
              { backgroundColor: colors.accent, paddingTop: insets.top + 16 },
            ]}
          >
            <Text style={[styles.appName, { color: colors.textInverse }]}>לוחות</Text>
            <Text style={[styles.headerHebDate, { color: colors.textInverse, opacity: 0.85 }]}>
              {hebLabel}
            </Text>
            <Text style={[styles.headerGregDate, { color: colors.textInverse, opacity: 0.7 }]}>
              {gregLabel}
            </Text>
          </View>

          {/* Navigation items — placeholder for 3.7a-1.
              Richer drawer contents (Week, Details, About, Tour) arrive in 3.7b–3.7c. */}
          <View style={styles.items}>
            <DrawerItem
              Icon={BookOpenText}
              label="לוח עברי"
              onPress={() => navigateTo('/(tabs)/')}
            />
            <DrawerItem
              Icon={Calendar}
              label="לוח לועזי"
              onPress={() => navigateTo('/(tabs)/gregorian')}
            />
            <DrawerItem
              Icon={Sun}
              label="יום"
              onPress={() => navigateTo('/(tabs)/day')}
            />
            {/* NEW in 3.7b-3 */}
            <DrawerItem
              Icon={CalendarRange}
              label="שבוע"
              onPress={() => navigateTo('/week')}
            />
            <DrawerItem
              Icon={Clock}
              label="זמנים"
              onPress={() => navigateTo('/(tabs)/zmanim')}
            />
            <DrawerItem
              Icon={Library}
              label="פרטי לימוד"
              onPress={() => navigateTo('/details')}
            />
            <DrawerItem
              Icon={MapPin}
              label="מיקום"
              onPress={() => navigateTo('/locationPicker')}
            />
            <DrawerItem
              Icon={CalendarArrowUp}
              label="ייצוא יומן"
              onPress={() => {
                closeDrawer();
                setTimeout(() => setExportModalVisible(true), 150);
              }}
            />

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <DrawerItem
              Icon={SettingsIcon}
              label="הגדרות"
              onPress={() => navigateTo('/settings')}
            />
            <DrawerItem
              Icon={Heart}
              label="תמיכה בפרויקט"
              onPress={() => navigateTo('/support')}
            />
            {/* NEW in 3.7c — final item */}
            <DrawerItem
              Icon={Info}
              label="אודות"
              onPress={() => navigateTo('/about')}
            />
          </View>

          {/* Version string — pinned to the bottom via marginTop: 'auto' */}
          {!!APP_VERSION && (
            <Text
              style={[
                styles.version,
                { color: colors.textTertiary, paddingBottom: insets.bottom + 12 },
              ]}
            >
              {`גרסה ${APP_VERSION}`}
            </Text>
          )}
        </Animated.View>
      </GestureDetector>
      <ExportModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,             // anchored to left edge — matches hamburger button
    bottom: 0,
    // Shadow on the panel's right (leading) edge. Android's `elevation` draws
    // an all-around drop shadow (no per-edge control); shadowOffset here
    // biases the iOS shadow to emanate from the right.
    shadowOffset: { width: 4, height: 0 },
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  appName: {
    textAlign: 'right',
    ...withFontFamily(typography.displayMedium),
  },
  headerHebDate: {
    // Figma target: 14 Medium — exact match via typography.label (14/400
    // default) with weight overridden to 500.
    textAlign: 'right',
    marginTop: 4,
    ...withFontFamily(typography.label, '500'),
  },
  headerGregDate: {
    // Figma target: 11 Regular — exact match via typography.caption (11/500
    // default) with weight overridden to 400.
    textAlign: 'right',
    marginTop: 2,
    ...withFontFamily(typography.caption, '400'),
  },
  items: {
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
    marginHorizontal: 10,
  },
  version: {
    // Figma target: 11 Regular — exact match via typography.caption (11/500
    // default) with weight overridden to 400.
    marginTop: 'auto',
    textAlign: 'right',
    paddingHorizontal: 20,
    paddingTop: 8,
    ...withFontFamily(typography.caption, '400'),
  },
});
