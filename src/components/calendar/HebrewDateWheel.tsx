// src/components/calendar/HebrewDateWheel.tsx
// Pure presentational drum-wheel component for the Hebrew date picker.
// No store access. Two columns rendered right-to-left via row-reverse so
// columns[0] (month) lands on the right and columns[1] (year) on the left.

import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { typography, withFontFamily } from '../../constants/typography';

// ── Constants ──────────────────────────────────────────────────────────────────

const ITEM_HEIGHT = 44;
const VISIBLE = 5;
const DRUM_HEIGHT = VISIBLE * ITEM_HEIGHT; // 220

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DrumColumn {
  items: { label: string; value: number }[];
  selectedIndex: number;
  onIndexChange: (index: number) => void;
  width: number;
}

export interface HebrewDateWheelProps {
  columns: DrumColumn[];
}

// ── WheelColumn ────────────────────────────────────────────────────────────────
// Inner sub-component so each column can own its own useRef and useEffect.
// Hooks must be at the top of the component, not inside a .map callback.

interface WheelColumnProps {
  items: { label: string; value: number }[];
  selectedIndex: number;
  onIndexChange: (index: number) => void;
  width: number;
}

function WheelColumn({ items, selectedIndex, onIndexChange, width }: WheelColumnProps) {
  const colors = useThemeColors();
  const scrollRef = useRef<ScrollView>(null);

  // Re-center when selectedIndex changes externally (e.g. month clamp after year change).
  // Scrolling to the already-current offset is harmless — no extra guard needed.
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
  }, [selectedIndex]);

  return (
    <View style={[styles.columnContainer, { width }]}>
      {/* Center highlight band — pointerEvents none so it doesn't intercept scroll */}
      <View
        pointerEvents="none"
        style={[
          styles.highlightBand,
          {
            borderTopColor: colors.accent,
            borderBottomColor: colors.accent,
            opacity: 0.4,
          },
        ]}
      />
      <ScrollView
        ref={scrollRef}
        style={{ height: DRUM_HEIGHT, width }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
        onMomentumScrollEnd={(e) => {
          const raw = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
          const idx = Math.max(0, Math.min(raw, items.length - 1));
          if (idx !== selectedIndex) {
            onIndexChange(idx);
          }
        }}
      >
        {items.map((item, i) => {
          const isSelected = i === selectedIndex;
          return (
            <View key={item.value} style={styles.item}>
              <Text
                style={[
                  styles.itemText,
                  isSelected
                    ? { fontWeight: '700', color: colors.accent }
                    : { fontWeight: '400', color: colors.textPrimary },
                ]}
              >
                {item.label}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ── HebrewDateWheel ────────────────────────────────────────────────────────────

export function HebrewDateWheel({ columns }: HebrewDateWheelProps) {
  return (
    // row-reverse: columns[0] (month) renders RIGHTMOST, columns[1] (year) on the left.
    <View style={styles.outerContainer}>
      {columns.map((col, i) => (
        <WheelColumn
          key={i}
          items={col.items}
          selectedIndex={col.selectedIndex}
          onIndexChange={col.onIndexChange}
          width={col.width}
        />
      ))}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // row-reverse so columns[0] lands on the right
  outerContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Relatively-positioned wrapper so the highlight band can be absolutely placed
  columnContainer: {
    position: 'relative',
    height: DRUM_HEIGHT,
  },

  // Center highlight band sits over the middle row (rows 0–4, center = row 2)
  highlightBand: {
    position: 'absolute',
    top: 2 * ITEM_HEIGHT,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 1,
  },

  // paddingVertical = 2 * ITEM_HEIGHT so first/last items can center.
  // contentInset is iOS-only and is a no-op on Android — use paddingVertical.
  scrollContent: {
    paddingVertical: 2 * ITEM_HEIGHT,
  },

  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },

  itemText: {
    ...withFontFamily(typography.bodyLarge),
    textAlign: 'center',
  },
});
