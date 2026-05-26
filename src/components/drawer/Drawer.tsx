// src/components/drawer/Drawer.tsx
// Hamburger drawer — slides in from the right (RTL) when isOpen is true.
// Built from scratch using react-native-reanimated 3 + GestureDetector.
// No new npm dependencies.
//
// Layout logic:
//   translateX: 0 = open (panel at right edge, fully visible)
//   translateX: drawerWidth = closed (panel off-screen to the right)
//   In RTL, the right edge IS the "near" edge, so this produces a
//   natural slide-in-from-right effect.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import {
  Calendar,
  BookOpenText,
  Sun,
  Clock,
  Library,
  Settings as SettingsIcon,
} from 'lucide-react-native';
import { useDrawerStore } from '../../providers/DrawerProvider';
import { useThemeColors } from '../../hooks/useThemeColors';
import { overlay } from '../../constants/overlay';
import { radius } from '../../constants/radius';
import { DrawerItem } from './DrawerItem';

const DRAWER_WIDTH_RATIO = 0.8;
const DRAWER_MAX_WIDTH = 320;
const ANIMATION_DURATION = 250;
const SWIPE_CLOSE_VELOCITY = 400;
const SWIPE_CLOSE_DISTANCE = 60;

export function Drawer() {
  const colors = useThemeColors();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const drawerWidth = Math.min(screenWidth * DRAWER_WIDTH_RATIO, DRAWER_MAX_WIDTH);

  const isOpen = useDrawerStore((s) => s.isOpen);
  const closeDrawer = useDrawerStore((s) => s.close);

  // translateX: 0 = open (visible at right edge), drawerWidth = closed (off-screen)
  const translateX = useSharedValue(drawerWidth);
  const backdropOpacity = useSharedValue(0);

  // backdropInteractive: lifted out of animated style to avoid Reanimated 3
  // edge-case bugs with pointerEvents inside useAnimatedStyle across versions.
  const [backdropInteractive, setBackdropInteractive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      translateX.value = withTiming(0, { duration: ANIMATION_DURATION });
      backdropOpacity.value = withTiming(1, { duration: ANIMATION_DURATION });
      setBackdropInteractive(true);
    } else {
      translateX.value = withTiming(drawerWidth, { duration: ANIMATION_DURATION });
      backdropOpacity.value = withTiming(0, { duration: ANIMATION_DURATION });
      // Delay disabling interaction until the close animation finishes
      const timer = setTimeout(() => setBackdropInteractive(false), ANIMATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [isOpen, drawerWidth, translateX, backdropOpacity]);

  const animatedDrawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  // Swipe-to-close: drag the panel to the right (away from screen center in RTL)
  // runOnJS is required because Zustand setters run on the JS thread,
  // not on the Reanimated worklet thread.
  const swipeGesture = Gesture.Pan()
    .onUpdate((e) => {
      // Only allow rightward drag (positive translationX = outward in RTL)
      if (e.translationX > 0) {
        translateX.value = e.translationX;
        backdropOpacity.value = Math.max(0, 1 - e.translationX / drawerWidth);
      }
    })
    .onEnd((e) => {
      const shouldClose =
        e.velocityX > SWIPE_CLOSE_VELOCITY ||
        e.translationX > SWIPE_CLOSE_DISTANCE;
      if (shouldClose) {
        runOnJS(closeDrawer)();
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

  const todayLabel = new Date().toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <>
      {/* Backdrop — tappable to close, non-interactive when drawer is closed */}
      <Animated.View
        style={[
          styles.backdrop,
          { backgroundColor: overlay.modal },
          animatedBackdropStyle,
        ]}
        pointerEvents={backdropInteractive ? 'auto' : 'none'}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={closeDrawer}
        />
      </Animated.View>

      {/* Drawer panel — anchored to right edge, slides in/out */}
      <GestureDetector gesture={swipeGesture}>
        <Animated.View
          style={[
            styles.drawer,
            {
              width: drawerWidth,
              backgroundColor: colors.surface,
              borderLeftColor: colors.border,
            },
            animatedDrawerStyle,
          ]}
        >
          {/* Header — today's date as orientation anchor */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {todayLabel}
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

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <DrawerItem
              Icon={SettingsIcon}
              label="הגדרות"
              onPress={() => navigateTo('/settings')}
            />
          </View>
        </Animated.View>
      </GestureDetector>
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
    right: 0,            // anchored to right edge — RTL slide-in
    bottom: 0,
    borderLeftWidth: StyleSheet.hairlineWidth,
    paddingTop: (StatusBar.currentHeight ?? 0) + 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  items: {
    paddingHorizontal: 10,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
    marginHorizontal: 10,
  },
});
