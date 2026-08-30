// Single source of truth for the modal scrim opacity, so the rgba string
// and the bare numeric value used by @gorhom/bottom-sheet's
// BottomSheetBackdrop (which cannot accept an rgba string) can never drift
// apart. Update MODAL_OPACITY only; `modal` derives from it.
const MODAL_OPACITY = 0.45;

export const overlay = {
  modal: `rgba(0, 0, 0, ${MODAL_OPACITY})`,
  modalOpacity: MODAL_OPACITY,
} as const;

export type Overlay = typeof overlay;
