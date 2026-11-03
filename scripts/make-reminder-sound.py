# Renders assets/sounds/luchot_reminder.wav (run: python scripts/make-reminder-sound.py).
# The melody was pitch-tracked from Shlomo's whistle (2026-11-03): onset time in the
# recording (s) and the nearest MIDI note. Played one octave down as an electronic
# pluck, with onsets time-scaled so the whole sound lasts ~1.25 s.
import wave
import numpy as np

SR = 44100
NOTES = [(0.70, 92), (1.01, 94), (1.44, 96), (2.05, 97), (2.35, 97), (2.55, 96), (2.95, 92)]
LAST_ONSET = 1.05  # s
TAIL = 0.20        # s

t0 = NOTES[0][0]
scale = LAST_ONSET / (NOTES[-1][0] - t0)
y = np.zeros(int((LAST_ONSET + TAIL) * SR))
for onset, midi in NOTES:
    f = 440 * 2 ** ((midi - 12 - 69) / 12)
    n0 = int((onset - t0) * scale * SR)
    tt = np.arange(len(y) - n0) / SR
    env = np.minimum(1, tt / 0.003) * np.exp(-tt * 9.0)
    tone = (np.sin(2 * np.pi * f * tt) + 0.28 * np.sin(2 * np.pi * 2 * f * tt)
            + 0.08 * np.sin(2 * np.pi * 3 * f * tt) + 0.15 * np.sin(2 * np.pi * f * 1.004 * tt))
    y[n0:] += env * tone
y = y / np.max(np.abs(y)) * 0.84  # about -1.5 dBFS
fade = int(0.04 * SR)
y[-fade:] *= np.linspace(1, 0, fade)
with wave.open('assets/sounds/luchot_reminder.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((y * 32767).astype('<i2').tobytes())
