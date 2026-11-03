# 'notes' version compressed to ~1.25 s: same 7 notes, onsets time-scaled.
import wave, numpy as np
SR = 44100
segs = np.load('segs.npy'); t0 = segs[0, 0]
SCALE = 1.05 / (segs[-1, 0] - t0)   # last note starts at 1.05 s
TAIL = 0.20
y = np.zeros(int((1.05 + TAIL) * SR))
for s0, s1, m, q, pk in segs:
    f = 440 * 2 ** ((q - 12 - 69) / 12)
    n0 = int((s0 - t0) * SCALE * SR)
    tt = np.arange(len(y) - n0) / SR
    env = np.minimum(1, tt / 0.003) * np.exp(-tt * 9.0)
    tone = (np.sin(2*np.pi*f*tt) + 0.28*np.sin(2*np.pi*2*f*tt) + 0.08*np.sin(2*np.pi*3*f*tt)
            + 0.15*np.sin(2*np.pi*f*1.004*tt))
    y[n0:] += env * tone
y = y / np.max(np.abs(y)) * 0.84
fade = int(0.04 * SR); y[-fade:] *= np.linspace(1, 0, fade)
with wave.open('luchot_reminder.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((y * 32767).astype('<i2').tobytes())
print(f'{len(y)/SR:.2f}s scale={SCALE:.3f}')
