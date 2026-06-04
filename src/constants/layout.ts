// RTL (Hebrew) convention: swipe right (velocityX > 0) = forward in time (+1).
// Future LTR language support: flip SWIPE_RTL_FORWARD to false (or wire to language setting).
// This is the single source of truth for swipe direction across all gesture handlers.
export const SWIPE_RTL_FORWARD = true;

export function swipeDirection(velocityX: number): 1 | -1 {
  const right = velocityX > 0;
  return (SWIPE_RTL_FORWARD ? right : !right) ? 1 : -1;
}
