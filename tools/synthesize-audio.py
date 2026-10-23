#!/usr/bin/env python3
"""Original Grave Accord audio proofs, composed and synthesized without samples.

Requires Python 3.10+ and numpy. All score events, seeds and synthesis parameters
are editable here. A fixed sample count makes every music bus truly circular:
note/reverb tails wrap into the next cycle rather than fading at the loop point.

Run: python tools/synthesize-audio.py
Check delivered bytes only: python tools/synthesize-audio.py --verify-only

This script performs objective signal checks. It does not claim listening tests,
native device playback, perceptual loudness certification, or final game mixing.
"""
from __future__ import annotations

import argparse
import html
import hashlib
import json
import math
from pathlib import Path
import wave

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "audio"
RATE = 44100
SEED = 221026
BUS_NAMES = ("bells", "strings", "bass", "percussion")
SOURCE_ID = "grave-accord-original-synthesis-v1"
SCORE: list[dict] = []


def midi(note: float) -> float:
    return 440.0 * 2.0 ** ((note - 69.0) / 12.0)


def times(seconds: float) -> np.ndarray:
    return np.arange(max(1, round(seconds * RATE)), dtype=np.float64) / RATE


def envelope(t: np.ndarray, attack: float, release: float) -> np.ndarray:
    """Cosine attack/release; exact zero endpoints for one-shot safety."""
    attack = max(attack, 1.0 / RATE)
    release = max(release, 1.0 / RATE)
    a = np.minimum(t / attack, 1.0)
    r = np.minimum(np.maximum(t[-1] - t, 0) / release, 1.0)
    return np.sin(a * np.pi / 2) ** 2 * np.sin(r * np.pi / 2) ** 2


def soft_lowpass(x: np.ndarray, cutoff: float, order: int = 2) -> np.ndarray:
    """Zero-phase frequency-domain damping, used on bounded one-shot voices."""
    f = np.fft.rfftfreq(len(x), 1.0 / RATE)
    damping = 1.0 / np.sqrt(1.0 + (f / cutoff) ** (2 * order))
    return np.fft.irfft(np.fft.rfft(x) * damping, n=len(x))


def noise(seconds: float, rng: np.random.Generator, low: float, high: float) -> np.ndarray:
    t = times(seconds)
    x = rng.standard_normal(len(t))
    f = np.fft.rfftfreq(len(x), 1.0 / RATE)
    h = (1.0 - np.exp(-(f / max(low, 1)) ** 4)) / np.sqrt(1 + (f / high) ** 6)
    y = np.fft.irfft(np.fft.rfft(x) * h, n=len(x))
    return y / max(np.std(y), 1e-10)


def bell(note: float, seconds: float, velocity: float = 1.0, dark: bool = True) -> np.ndarray:
    """Muted cast bell with deliberately inharmonic upper partials."""
    t = times(seconds)
    f = midi(note)
    partials = ((1.0, 1.0, 1.55), (2.01, .34, .85), (2.756, .17, .62),
                (4.07, .065, .34), (5.43, .025, .19))
    y = np.zeros_like(t)
    for ratio, amplitude, decay in partials:
        y += amplitude * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t / decay)
    if dark:
        y = soft_lowpass(y, 3700)
    return velocity * .58 * y * envelope(t, .009, .23)


def bowed(note: float, seconds: float, velocity: float = 1.0, short: bool = False) -> np.ndarray:
    """Warm small string ensemble: three detuned harmonic voices, gentle bow."""
    t = times(seconds)
    y = np.zeros_like(t)
    for cents, phase in ((-5.3, .17), (0, 1.33), (4.7, 2.44)):
        f = midi(note + cents / 100)
        vibrato = .003 * f / 4.7 * np.sin(2 * np.pi * 4.7 * t + phase)
        for harmonic in range(1, 9):
            amplitude = harmonic ** -1.55 * math.exp(-harmonic / 9)
            y += amplitude * np.sin(2 * np.pi * harmonic * f * t + harmonic * vibrato + phase)
    attack = .025 if short else min(.39, seconds / 4)
    release = .10 if short else min(.55, seconds / 3)
    return velocity * .15 * y * envelope(t, attack, release) * (.97 + .03 * np.sin(2 * np.pi * .7 * t))


def pluck(note: float, seconds: float, velocity: float = 1.0) -> np.ndarray:
    """Muted low string/bass, with round attack and no infrasonic component."""
    t = times(seconds)
    f = midi(note)
    y = np.sin(2 * np.pi * f * t)
    y += .26 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / .3)
    y += .10 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t / .12)
    return velocity * .72 * y * np.exp(-t / .62) * envelope(t, .009, .16)


def drum(kind: str, rng: np.random.Generator, velocity: float = 1.0) -> np.ndarray:
    if kind == "kick":
        t = times(.36)
        phase = 2 * np.pi * (48 * t + (102 - 48) * .035 * (1 - np.exp(-t / .035)))
        y = np.sin(phase) * np.exp(-t / .085)
        y += .025 * noise(.36, rng, 900, 3000) * np.exp(-t / .009)
    elif kind == "rim":
        t = times(.19)
        y = .29 * noise(.19, rng, 500, 3400) * np.exp(-t / .036)
        y += .23 * np.sin(2 * np.pi * 410 * t) * np.exp(-t / .019)
        y += .12 * np.sin(2 * np.pi * 693 * t) * np.exp(-t / .012)
    elif kind == "tick":
        t = times(.11)
        y = .20 * noise(.11, rng, 1700, 5400) * np.exp(-t / .014)
        y += .06 * np.sin(2 * np.pi * 1440 * t) * np.exp(-t / .010)
    elif kind == "tom":
        t = times(.46)
        phase = 2 * np.pi * (91 * t + 15 * .07 * (1 - np.exp(-t / .07)))
        y = .5 * np.sin(phase) * np.exp(-t / .12)
        y += .07 * noise(.46, rng, 250, 1800) * np.exp(-t / .06)
    else:
        raise ValueError(kind)
    return velocity * y * envelope(t, .0015, .025)


def circular_add(target: np.ndarray, voice: np.ndarray, frame: int, gain: float, pan: float) -> None:
    """Equal-power pan. Circular deposition wraps complete note tails."""
    left = math.cos((pan + 1) * np.pi / 4) * gain
    right = math.sin((pan + 1) * np.pi / 4) * gain
    offset = 0
    while offset < len(voice):
        start = (frame + offset) % len(target)
        count = min(len(voice) - offset, len(target) - start)
        target[start:start + count, 0] += voice[offset:offset + count] * left
        target[start:start + count, 1] += voice[offset:offset + count] * right
        offset += count


def circular_room(x: np.ndarray, amount: float) -> np.ndarray:
    """Sparse dark early reflections, circular rather than a cropped reverb."""
    y = x.copy()
    for delay, level in ((.061, .38), (.113, .26), (.179, .18), (.283, .12), (.437, .075)):
        d = round(delay * RATE)
        wet = np.roll(x[:, ::-1], d, axis=0)
        # Damping is cyclic too; do not introduce a separate endpoint transient.
        wet = (wet + np.roll(wet, 1, axis=0) + np.roll(wet, -1, axis=0)) / 3
        y += wet * amount * level
    return y


def music(track: str, bpm: int) -> tuple[dict[str, np.ndarray], dict]:
    n = round(RATE * 32 * 60 / bpm)
    seconds_per_beat = n / RATE / 32
    rng = np.random.default_rng(SEED + (0 if track == "city-wake" else 1))
    buses = {name: np.zeros((n, 2), dtype=np.float64) for name in BUS_NAMES}

    def event(bus: str, beat: float, note: float | str, length: float, gain: float, pan: float = 0,
              short: bool = False, human: float = 0) -> None:
        sec = length * seconds_per_beat
        if bus == "bells":
            voice = bell(float(note), sec)
        elif bus == "strings":
            voice = bowed(float(note), sec, short=short)
        elif bus == "bass":
            voice = pluck(float(note), sec)
        else:
            voice = drum(str(note), rng)
        timing = human * float(rng.uniform(-1, 1))
        frame = round((beat * seconds_per_beat + timing) * RATE)
        circular_add(buses[bus], voice, frame, gain, pan)
        SCORE.append({"track": track, "bus": bus, "beat": beat, "note": note,
                      "lengthBeats": length, "gain": gain, "pan": pan,
                      "timingOffsetSeconds": round(timing, 7), "short": short})

    if track == "city-wake":
        # D Aeolian chamber progression; A major briefly restores direction home.
        chords = ((50, 57, 65, 69), (46, 53, 62, 65), (41, 53, 60, 67), (48, 55, 62, 67),
                  (43, 50, 58, 65), (45, 53, 57, 62), (45, 52, 61, 67), (50, 57, 64, 65))
        roots = (38, 34, 41, 36, 31, 33, 33, 38)
        melody = ((0, 74, 2.8), (2.5, 69, 1.8), (4, 77, 2.7), (6.5, 76, 1.7),
                  (8.5, 74, 2.8), (11, 72, 1.8), (12, 67, 3), (15, 69, 1.8),
                  (16, 70, 2.7), (18.5, 69, 1.7), (20, 65, 2.8), (22.5, 67, 1.8),
                  (24, 69, 2), (26, 73, 2), (28, 74, 3.5), (31, 69, 2.3))
        for bar, chord in enumerate(chords):
            for i, note in enumerate(chord):
                event("strings", bar * 4 + i * .025, note, 4.8, .44 if i < 2 else .30, -.47 + .31 * i)
            event("bass", bar * 4, roots[bar], 2.5, .32, -.08)
            event("bass", bar * 4 + 2.5, roots[bar] + 7, 1.5, .17, .06)
            event("percussion", bar * 4, "kick", 1, .12)
            event("percussion", bar * 4 + 2, "rim", .5, .11, -.2)
            for b in (1.5, 3.5):
                event("percussion", bar * 4 + b, "tick", .2, .15, .30, human=.004)
        for index, (beat, note, length) in enumerate(melody):
            event("bells", beat, note, length, .24 if index % 4 != 0 else .29, -.27 if index % 2 == 0 else .27,
                  human=.005)
        # Low viola answers rather than a continuously competing lead.
        for beat, note in ((7, 62), (11, 60), (19, 58), (23, 57), (27, 61), (30, 62)):
            event("strings", beat, note, 1.25, .19, .38)
        intent = "78 BPM, 4/4, eight bars; D Aeolian with an A-major leading-tone turn; spacious hub chamber loop."
    else:
        # Eight-bar dark chamber pulse; semitone Eb/D is the city's warning interval.
        chords = ((50, 57, 65), (51, 58, 67), (46, 53, 62), (45, 52, 62),
                  (43, 50, 58), (51, 58, 65), (45, 52, 61), (50, 57, 65))
        roots = (38, 39, 34, 33, 31, 39, 33, 38)
        for bar, chord in enumerate(chords):
            for b, i in ((0, 0), (.75, 1), (1.5, 2), (2.25, 1), (3, 0), (3.5, 2)):
                event("strings", bar * 4 + b, chord[i], .52, .48 if b in (0, 3) else .36,
                      -.30 if i % 2 == 0 else .30, short=True, human=.003)
            event("strings", bar * 4, chord[1] + 12, 4.3, .16, .37)
            for b, interval, g in ((0, 0, .36), (1.5, 0, .25), (2.75, 7, .27), (3.5, 12, .19)):
                event("bass", bar * 4 + b, roots[bar] + interval, .9, g, -.04)
            for b, g in ((0, .32), (1.5, .20), (2.75, .23)):
                event("percussion", bar * 4 + b, "kick", .5, g, human=.002)
            event("percussion", bar * 4 + 2, "rim", .5, .33, -.15, human=.003)
            for index, b in enumerate((.5, 1, 1.75, 2.5, 3.25, 3.75)):
                event("percussion", bar * 4 + b, "tick", .2, .19 if index % 2 == 0 else .13,
                      -.35 if index % 2 == 0 else .35, human=.004)
            if bar in (3, 7):
                event("percussion", bar * 4 + 3.25, "tom", .5, .24, -.22)
                event("percussion", bar * 4 + 3.75, "tom", .5, .19, .22)
        melody = ((0, 74, 1.4), (1.5, 77, 1.5), (3, 76, 1.3), (4, 75, 2.4), (7, 70, 1.5),
                  (8, 74, 1.6), (10, 72, 1.4), (11.5, 70, 1.1), (12, 69, 2.4), (15, 73, 1.2),
                  (16, 74, 1.4), (17.5, 79, 1.3), (19, 77, 1.2), (20, 75, 1.6), (22, 70, 1.8),
                  (24, 73, 1.3), (25.5, 76, 1.4), (27, 73, 1.4), (28, 74, 2), (30.5, 69, 1.6))
        for index, (beat, note, length) in enumerate(melody):
            event("bells", beat, note, length + .6, .20 if index % 4 else .25,
                  -.22 if index % 2 == 0 else .22, human=.003)
        intent = "104 BPM, 4/4, eight bars; D-minor pulse with Phrygian Eb/D tension and cadential C-sharp; combat loop."

    for bus in BUS_NAMES:
        buses[bus] = circular_room(buses[bus], .44 if bus == "bells" else .25 if bus == "strings" else .09)
        buses[bus] -= np.mean(buses[bus], axis=0)
    full = sum(buses.values())
    # Common linear gain keeps stems summable. No limiter or crossfade hides seams.
    gain = .68 / max(float(np.max(np.abs(full))), 1e-10)
    buses = {key: value * gain for key, value in buses.items()}
    return buses, {"id": track, "bpm": bpm, "meter": "4/4", "bars": 8, "beats": 32,
                   "sampleRate": RATE, "loopStartFrame": 0, "loopEndFrameExclusive": n,
                   "durationSeconds": n / RATE, "arrangement": intent,
                   "masterGainLinear": gain, "loopMethod": "circular voices and dark early-reflection tails; no endpoint fade"}


def one_shot(seconds: float, events: list[tuple[float, np.ndarray, float]], room: float = .0) -> np.ndarray:
    """Fixed-length SFX including a reserved decay, zero endpoints, normalized safely."""
    n = round(seconds * RATE)
    y = np.zeros((n, 2), dtype=np.float64)
    for position, voice, gain in events:
        start = round(position * RATE)
        if start >= n:
            continue
        length = min(len(voice), n - start)
        y[start:start + length, 0] += voice[:length] * gain * .70710678
        y[start:start + length, 1] += voice[:length] * gain * .70710678
    if room:
        dry = y.copy()
        for delay, level in ((.031, .35), (.073, .19), (.127, .09)):
            d = round(delay * RATE)
            y[d:] += dry[:-d] * room * level
    fade = round(.012 * RATE)
    y[:round(.0015 * RATE)] *= np.linspace(0, 1, round(.0015 * RATE))[:, None] ** 2
    y[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 2
    y -= np.mean(y, axis=0)
    # DC removal can perturb endpoints by a few PCM steps; fade again afterward.
    y[:round(.0015 * RATE)] *= np.linspace(0, 1, round(.0015 * RATE))[:, None] ** 2
    y[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 2
    return y * (.70 / max(float(np.max(np.abs(y))), 1e-9))


def glide(start: float, end: float, seconds: float, decay: float = .0) -> np.ndarray:
    t = times(seconds)
    # Exponential frequency trajectory with analytic integrated phase.
    a = math.log(end / start) / seconds if end != start else 0
    phase = 2 * np.pi * (start * np.expm1(a * t) / a if a else start * t)
    y = np.sin(phase) + .16 * np.sin(phase * 2)
    if decay:
        y *= np.exp(-t / decay)
    return y * envelope(t, .006, min(.08, seconds / 3))


def make_sfx() -> dict[str, tuple[np.ndarray, dict]]:
    rng = np.random.default_rng(SEED + 100)
    out: dict[str, tuple[np.ndarray, dict]] = {}

    def add(name: str, seconds: float, events: list, role: str, priority: int, room: float = .0,
            caption: str | None = None, **extra: object) -> None:
        out[name] = (one_shot(seconds, events, room), {"id": name, "role": role, "priority": priority,
                                                     "visualMeaning": caption or role, "loop": False,
                                                     "spatial": priority < 80, **extra})

    def air(seconds: float, low: float, high: float, fall: float) -> np.ndarray:
        t = times(seconds)
        return noise(seconds, rng, low, high) * np.exp(-t / fall) * envelope(t, .002, .025)

    weapons = (
        ("pistol", .24, 155, 58, .030, .16, "Soldier pistol: short dry crack and low recoil."),
        ("heavy-lmg", .19, 125, 52, .023, .19, "Heavy machine gun: lower short mechanical report."),
        ("shotgun", .39, 112, 39, .065, .37, "Tank shotgun: wide softened impact and deeper recoil."),
        ("injector", .23, 750, 310, .025, .085, "Medic injector: air click and small descending glass tone."),
        ("grave-wand", .42, 420, 125, .13, .065, "Mage wand: damped descending harmonic pulse."),
        ("rivet", .26, 980, 175, .035, .12, "Engineer rivet: bright metal onset with short body."),
        ("needle", .20, 1420, 460, .028, .075, "Assassin needle: narrow soft pneumatic hiss."),
    )
    for name, duration, start, end, fall, noisiness, role in weapons:
        add("weapon-" + name, duration, [(0, glide(start, end, duration, fall), .45),
                                         (0, air(duration, 500, 4200, .020 if name != "shotgun" else .050), noisiness)],
            role, 20, maxVoices=8, cooldownSeconds=.045)
    add("impact-flesh", .24, [(0, glide(138, 48, .20, .04), .38), (0, air(.22, 150, 1800, .03), .28)],
        "Enemy hit: muted low thud, no exaggerated gore.", 18, maxVoices=6)
    add("impact-armor", .31, [(0, bell(78, .30), .45), (0, air(.18, 900, 3800, .02), .10)],
        "Armored hit: ceramic-metal tick indicates reduced damage.", 25, maxVoices=4)
    t = times(.31)
    rush = noise(.31, rng, 350, 4200) * np.sin(np.pi * np.arange(len(t)) / max(1, len(t) - 1)) ** 2
    add("dodge", .35, [(0, rush, .14), (0, glide(450, 125, .30), .06)],
        "Local dodge: brief cloth and air movement.", 45, maxVoices=2)
    add("warning", .68, [(0, bell(86, .42), .42), (.22, bell(85, .42), .42)],
        "High-priority two-note descending danger signal.", 100, caption="Incoming marked attack", maxVoices=1,
        minimumIntervalSeconds=.6)
    add("revive", 1.30, [(0, bell(74, .90), .30), (.17, bell(77, .90), .30),
                         (.35, bell(81, .90), .30), (.54, bowed(86, .70), .38)],
        "Completed revive: warm upward three-note restoration, not the channel itself.", 90, .25,
        caption="Ally revived", maxVoices=2)
    add("accord-success", 1.65, [(0, drum("tom", rng), .45), (0, bell(62, 1.5), .38),
                                 (.12, bell(69, 1.45), .34), (.24, bell(74, 1.35), .30),
                                 (.36, bowed(77, 1.2), .35)],
        "Accord Break success: D-A-D-F communal consonance and warm low knock.", 95, .40,
        caption="Accord Break: boss vulnerable", maxVoices=1)
    add("ui-confirm", .27, [(0, bell(81, .22), .31), (.07, bell(86, .19), .25)],
        "Confirm, purchase or ready action: two small upward taps.", 60, maxVoices=1)
    add("ui-back", .21, [(0, bell(74, .19), .25), (.06, bell(69, .14), .17)],
        "Back or cancel: quieter descending taps.", 55, maxVoices=1)
    add("downed", .90, [(0, glide(242, 68, .70, .3), .27), (0, bowed(50, .85), .5)],
        "Local downed state: downward double body, distinct from defeat music.", 90,
        caption="You are downed; revive window open", maxVoices=1)
    add("ultimate-ready", .60, [(0, bell(81, .55), .22), (.14, bell(86, .43), .20)],
        "Local ultimate-ready cue; one sound on transition to ready, never a repeating reminder.", 70,
        caption="Ultimate ready", maxVoices=1)
    add("boss-phase", 1.1, [(0, bell(38, 1.0), .52), (0, air(.65, 100, 1900, .21), .08),
                            (.15, bell(51, .85), .14)],
        "Boss phase transition: deep civic bell with tense semitone partial.", 85, .30,
        caption="Boss phase changed", maxVoices=1)

    # Seven deliberately different cast identities, rather than recolored generic booms.
    add("ultimate-soldier", .95, [(0, drum("rim", rng), .26), (0, bowed(62, .30, short=True), .52),
                                  (.17, bowed(69, .32, short=True), .55),
                                  (.36, bowed(74, .55, short=True), .60), (.36, bell(74, .57), .25)],
        "Last Roll Call: clear three-part D-A-D command signal and final reload latch.", 85, .20,
        classId="soldier", ultimateId="soldier-ultimate", caption="Last Roll Call active", maxVoices=2)
    add("ultimate-heavy", 1.05, [(0, glide(70, 140, .65), .22)] +
        [(i * .075, drum("rim", rng), .12 + .013 * i) for i in range(8)] +
        [(.34, bowed(38, .66), .50)],
        "Foundry Overture: accelerating eight-tooth feed motor over a low foundry string.", 85, .10,
        classId="heavy", ultimateId="heavy-ultimate", caption="Foundry Overture active", maxVoices=2)
    add("ultimate-tank", 1.20, [(0, drum("kick", rng), .65), (.12, drum("tom", rng), .35),
                               (.08, bell(38, 1.05), .45), (.08, bowed(50, 1.1), .42),
                               (.14, bell(57, .95), .20)],
        "The City Holds: low gate slam with stable D/A reinforcing overtones.", 85, .25,
        classId="tank", ultimateId="tank-ultimate", caption="The City Holds shield active", maxVoices=2)
    add("ultimate-medic", 1.65, [(0, bowed(74, 1.45), .25), (.12, bell(74, 1.4), .30),
                                (.34, bell(77, 1.2), .27), (.56, bell(81, 1.0), .26),
                                (.84, bell(86, .75), .28)],
        "Names Returned: rising glass D-F-A-D, a breath of bowed harmonics, delayed resolution.", 90, .35,
        classId="medic", ultimateId="medic-ultimate", caption="Names Returned cast", maxVoices=2)
    sw = times(.50)
    reverse = bell(74, .50)[::-1] * envelope(sw, .09, .015)
    add("ultimate-mage", 1.75, [(0, reverse, .38), (.46, bell(50, 1.25), .55),
                               (.84, bell(62, .86), .37), (1.2, bell(74, .48), .29)],
        "Silent Twelfth: reversed ink-bell intake and three descending-size pulses, no sustained hazard mask.",
        85, .35, classId="mage", ultimateId="mage-ultimate", caption="Silent Twelfth cast", maxVoices=2)
    add("ultimate-engineer", 1.25, [(i * .09, drum("tick", rng), .18) for i in range(7)] +
        [(.04, bell(50, 1.1), .27), (.20, bell(57, 1.0), .25), (.38, bell(60, .8), .22),
         (.57, bell(62, .65), .30), (.57, drum("kick", rng), .35)],
        "Impossible Machine: seven ratchet ticks, ascending D-A-C-D gears and a locking low knock.", 85, .20,
        classId="engineer", ultimateId="engineer-ultimate", caption="Impossible Machine deployed", maxVoices=2)
    add("ultimate-assassin", .82, [(0, air(.56, 600, 4300, .26)[::-1], .095),
                                  (.12, glide(midi(88), midi(62), .58, .19), .20),
                                  (.12, bell(81, .64), .26)],
        "Unwritten Passage: inward air, a narrow falling harmonic slash, then rapid silence.", 85, .10,
        classId="assassin", ultimateId="assassin-ultimate", caption="Unwritten Passage active", maxVoices=2)
    return out


def write_wav(path: Path, data: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = np.clip(np.rint(data * 32767), -32767, 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(pcm.tobytes())


def db(value: float) -> float:
    return round(20 * math.log10(max(value, 1e-12)), 5)


def read_wav(path: Path) -> tuple[np.ndarray, dict]:
    with wave.open(str(path), "rb") as w:
        info = {"sampleRate": w.getframerate(), "channels": w.getnchannels(),
                "sampleWidthBytes": w.getsampwidth(), "frames": w.getnframes()}
        assert w.getcomptype() == "NONE", f"{path}: PCM required"
        assert info["sampleRate"] == RATE and info["channels"] == 2 and info["sampleWidthBytes"] == 2
        x = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float64).reshape(-1, 2) / 32767
    return x, info


def metrics(path: Path, loop: bool) -> dict:
    x, info = read_wav(path)
    peak = float(np.max(np.abs(x)))
    rms = float(np.sqrt(np.mean(x ** 2)))
    diffs = np.max(np.abs(np.diff(x, axis=0)), axis=1)
    seam = float(np.max(np.abs(x[0] - x[-1])))
    reference = float(np.quantile(diffs, .999))
    radius = round(.020 * RATE)
    before = float(np.sqrt(np.mean(x[-radius:] ** 2)))
    after = float(np.sqrt(np.mean(x[:radius] ** 2)))
    mono_rms = float(np.sqrt(np.mean(np.mean(x, axis=1) ** 2)))
    d = {**info, "path": path.relative_to(ROOT).as_posix(), "bytes": path.stat().st_size,
         "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
         "durationSeconds": round(len(x) / RATE, 9), "peakDbfs": db(peak), "rmsDbfs": db(rms),
         "crestDb": round(db(peak) - db(rms), 5), "clippedSamples": int(np.sum(np.abs(x) >= 1)),
         "monoFoldDownLossDb": round(db(mono_rms) - db(rms), 5),
         "dcOffsetMax": round(float(np.max(np.abs(np.mean(x, axis=0)))), 9),
         "firstSampleAbsMax": round(float(np.max(np.abs(x[0]))), 9),
         "lastSampleAbsMax": round(float(np.max(np.abs(x[-1]))), 9),
         "seamStep": round(seam, 9), "interiorStepP99_9": round(reference, 9),
         "seamToInteriorStepRatio": round(seam / max(reference, 1 / 32767), 6),
         "seamWindowRmsBeforeDbfs": db(before), "seamWindowRmsAfterDbfs": db(after),
         "loop": loop}
    d["passed"] = bool(peak < .72 and rms > .0001 and d["clippedSamples"] == 0 and
                       d["monoFoldDownLossDb"] > -6 and
                       d["dcOffsetMax"] < .0001 and (not loop or seam <= reference * 1.5 + 2 / 32767) and
                       (loop or max(d["firstSampleAbsMax"], d["lastSampleAbsMax"]) <= 1 / 32767))
    return d


def waveform_svg(path: Path, tracks: list[dict]) -> None:
    """Small self-contained objective waveform view; no plotting package needed."""
    rows = []
    colors = ("#90b5b0", "#d0a56c")
    for index, track in enumerate(tracks):
        x, _ = read_wav(ROOT / track["path"])
        bands = np.array_split(x, 980)
        top, bottom = [], []
        y = 105 + index * 240
        for i, band in enumerate(bands):
            top.append(f"{70+i:.1f},{y-float(np.max(band))*78:.2f}")
            bottom.append(f"{70+i:.1f},{y-float(np.min(band))*78:.2f}")
        poly = " ".join(top + bottom[::-1])
        rows.append(f'<text x="70" y="{y-88}" fill="#eadcbe" font-size="18">{track["id"]} | '
                    f'{track["bpm"]} BPM | 8 bars | {track["durationSeconds"]:.6f} s</text>')
        rows.append(f'<path d="M70 {y}H1050" stroke="#687575"/>')
        rows.append(f'<polygon points="{poly}" fill="{colors[index]}" opacity=".8"/>')
        rows.append(f'<text x="70" y="{y+111}" fill="#ddd2ba" font-size="14">'
                    'Complete loop; wrapped instrument and room tails. Seam metrics are in the audio review JSON.</text>')
    body = "\n".join(rows)
    path.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="530" viewBox="0 0 1120 530">'
                    f'<rect width="1120" height="530" fill="#142327"/><g font-family="Arial,sans-serif">{body}</g></svg>',
                    encoding="utf-8")


def preview_html(manifest: dict) -> None:
    """Offline, non-autoplay listening worksheet; it is not the gameplay UI."""
    def card(entry: dict, loop: bool) -> str:
        path = Path(entry["path"]).relative_to("assets/audio").as_posix()
        title = entry["id"].replace("-", " ").title()
        role = entry.get("arrangement", entry.get("role", ""))
        return (f'<article><h3>{html.escape(title)}</h3><p>{html.escape(role)}</p>'
                f'<audio controls preload="none" {"loop" if loop else ""} src="{html.escape(path)}"></audio>'
                f'<p class="measure">{entry["durationSeconds"]:.3f} s · {entry["peakDbfs"]:.2f} dBFS peak · '
                f'{entry["rmsDbfs"]:.2f} dBFS RMS</p></article>')
    music_cards = "\n".join(card(item, True) for item in manifest["tracks"])
    sfx_cards = "\n".join(card(item, False) for item in manifest["sfx"])
    text = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Grave Accord | Original audio proofs</title><style>
:root{color-scheme:dark;background:#152125;color:#e6ddc8;font:17px/1.6 Georgia,serif}body{max-width:1120px;margin:auto;padding:36px 24px 70px}
.eyebrow,.measure{font:12px/1.5 system-ui,sans-serif;letter-spacing:.04em;color:#aebdb5}h1{font-size:clamp(32px,5vw,64px);line-height:1.04;margin:18px 0}
h2{font-size:29px;border-bottom:1px solid #4a5b59;padding-bottom:12px;margin-top:55px}h3{font-size:23px;margin:0 0 8px;color:#d6ac6d}
.intro{max-width:760px;color:#c9d4c9}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px}
article{padding:22px;background:#1d2d30;border:1px solid #415551;border-radius:7px}article p{font:14px/1.6 system-ui,sans-serif;min-height:44px;color:#ced7cb}
audio{display:block;width:100%;height:42px;margin-top:18px}.note{border-left:3px solid #b68e55;padding:12px 20px;background:#233034;font:14px/1.6 system-ui,sans-serif}
a{color:#c9dcce}.measure{min-height:0!important}footer{margin-top:50px;font:13px/1.7 system-ui,sans-serif;color:#9dacaa}
</style><header><div class="eyebrow">GRAVE ACCORD / STAGE 1 / ORIGINAL AUDIO</div><h1>Listen to the city.</h1>
<p class="intro">An eight-bar quiet hub and combat pair, with modal bells, bowed harmonics, warm bass and restrained mechanical percussion.
All sound here is original local synthesis. No sampled third-party material or music API is used.</p>
<p class="note">Music players loop automatically after you press play. Stop one before starting another. Start at a comfortable device volume.
Objective PCM, clipping, stem and boundary checks passed; human listening and device-mix approval remain pending.</p></header>
<main><h2>Music loops</h2><div class="grid">''' + music_cards + '''</div>
<h2>Interaction and ultimate cues</h2><div class="grid">''' + sfx_cards + '''</div></main>
<footer>44.1 kHz · signed 16-bit stereo PCM · editable score and synthesis source retained.<br>
<a href="manifest.json">File manifest</a> · <a href="score.json">Editable score events</a> · <a href="waveform-review.svg">Waveform view</a><br>
This English-language asset worksheet is separate from the localized game interface.</footer></html>'''
    (OUT / "preview.html").write_text(text, encoding="utf-8")


def verify(manifest: dict) -> dict:
    source_ok = hashlib.sha256(Path(__file__).read_bytes()).hexdigest() == manifest["sourceSha256"]
    expected = {item["path"] for item in manifest["files"]}
    actual = {path.relative_to(ROOT).as_posix() for path in OUT.rglob("*.wav")}
    inventory_ok = expected == actual and len(expected) == len(manifest["files"])
    all_cue_hashes = [entry["sha256"] for entry in manifest["files"] if not entry["loop"]]
    distinct_cues = len(set(all_cue_hashes)) == len(all_cue_hashes)
    results = []
    for entry in manifest["files"]:
        result = metrics(ROOT / entry["path"], bool(entry.get("loop")))
        result["id"] = entry["id"]
        result["expectedSha256Matches"] = result["sha256"] == entry["sha256"]
        assert result["expectedSha256Matches"], f'Hash mismatch: {entry["path"]}'
        results.append(result)
    stems = []
    for track in manifest["tracks"]:
        master, _ = read_wav(ROOT / track["path"])
        summed = sum(read_wav(ROOT / item)[0] for item in track["stems"])
        error = float(np.max(np.abs(master - summed)))
        stems.append({"id": track["id"], "maxAbsoluteStemSumError": round(error, 9),
                      "allowedError": round(3 / 32767, 9), "passed": error <= 3 / 32767})
    classes = json.loads((ROOT / "content" / "classes.json").read_text(encoding="utf-8-sig"))
    declared = {item["classId"]: item["ultimateId"] for item in manifest["sfx"] if "classId" in item}
    ultimate_ok = all(declared.get(c["id"]) == c["ultimate"]["id"] for c in classes) and len(declared) == 7
    report = {"schemaVersion": 1, "source": SOURCE_ID, "stage": "Stage 1 original audio proofs",
              "verificationType": "objective signal, PCM structure, inventory, hash and summation checks",
              "passed": all(item["passed"] and item["expectedSha256Matches"] for item in results) and
                        all(item["passed"] for item in stems) and ultimate_ok and source_ok and inventory_ok and distinct_cues,
              "musicLoopCount": len(manifest["tracks"]), "sfxCount": len(manifest["sfx"]),
              "wavCountIncludingStems": len(results), "sampleRate": RATE, "bitDepth": 16, "channels": 2,
              "allSevenUltimateIdsMatchContent": ultimate_ok, "stemSummation": stems, "files": results,
              "sourceHashMatches": source_ok, "manifestMatchesWavInventory": inventory_ok,
              "allSfxHaveDistinctHashes": distinct_cues,
              "unexpectedWavPaths": sorted(actual - expected), "missingWavPaths": sorted(expected - actual),
              "limitations": ["No human listening or native audio-device playback was performed.",
                              "Objective seam checks establish continuous PCM boundaries, not perceptual approval.",
                              "RMS and sample peak are measured; LUFS/true-peak compliance has not been measured.",
                              "SFX are representative Stage 1 assets; runtime mixes, phone speakers and crowded multiplayer need listening tests.",
                              "The full soundtrack, ambient beds and adaptive stems remain a specified production task; only two music proofs are delivered."]}
    report_path = ROOT / "reviews" / "audio-proof-review.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    if not report["passed"]:
        failed = [r["id"] for r in results if not r["passed"]]
        raise RuntimeError(f"Audio checks failed: {failed}; stem/ultimate checks: {stems}, {ultimate_ok}")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify-only", action="store_true")
    args = parser.parse_args()
    if args.verify_only:
        manifest = json.loads((OUT / "manifest.json").read_text(encoding="utf-8"))
        result = verify(manifest)
        print(json.dumps({k: result[k] for k in ("passed", "musicLoopCount", "sfxCount", "wavCountIncludingStems")}))
        return

    tracks = []
    files = []
    for name, bpm in (("city-wake", 78), ("vigil-engine", 104)):
        buses, info = music(name, bpm)
        master_path = OUT / "music" / f"{name}.wav"
        write_wav(master_path, sum(buses.values()))
        master_metrics = metrics(master_path, True)
        info["path"] = master_path.relative_to(ROOT).as_posix()
        info["stems"] = []
        for bus, signal in buses.items():
            stem_path = OUT / "stems" / f"{name}-{bus}.wav"
            write_wav(stem_path, signal)
            rel = stem_path.relative_to(ROOT).as_posix()
            info["stems"].append(rel)
            m = metrics(stem_path, True)
            files.append({"id": f"{name}-{bus}", "path": rel, "loop": True, "sha256": m["sha256"]})
        files.append({"id": name, "path": info["path"], "loop": True, "sha256": master_metrics["sha256"]})
        info["peakDbfs"] = master_metrics["peakDbfs"]
        info["rmsDbfs"] = master_metrics["rmsDbfs"]
        tracks.append(info)

    effects = []
    for name, (signal, info) in make_sfx().items():
        path = OUT / "sfx" / f"{name}.wav"
        write_wav(path, signal)
        m = metrics(path, False)
        info["path"] = path.relative_to(ROOT).as_posix()
        info["durationSeconds"] = m["durationSeconds"]
        info["peakDbfs"] = m["peakDbfs"]
        info["rmsDbfs"] = m["rmsDbfs"]
        effects.append(info)
        files.append({"id": name, "path": info["path"], "loop": False, "sha256": m["sha256"]})

    source_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    manifest = {"schemaVersion": 1, "source": SOURCE_ID, "seed": SEED, "sampleRate": RATE,
                "encoding": "RIFF/WAVE linear PCM signed 16-bit little-endian stereo",
                "authoringMethod": "Original editable procedural composition and synthesis; no sampled third-party audio or generative music service.",
                "sourcePath": "tools/synthesize-audio.py", "sourceSha256": source_hash,
                "license": "MIT, matching the repository",
                "playbackDefaults": {"musicGain": .25, "sfxGain": .70, "ambientGain": .18,
                                     "maxSfxVoices": 32, "maxWeaponVoices": 8,
                                     "warningMusicDuckDb": -6, "warningDuckAttackSeconds": .035,
                                     "warningDuckReleaseSeconds": .3,
                                     "maxPanAbsolute": .75,
                                     "note": "Initial design values. In-game and device listening validation remains required."},
                "tracks": tracks, "sfx": effects, "files": files}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    (OUT / "score.json").write_text(json.dumps({"schemaVersion": 1, "seed": SEED,
                                               "pitch": "MIDI number, A4=69=440 Hz",
                                               "timing": "quarter-note beats; beat zero is loop start",
                                               "events": SCORE}, indent=2) + "\n", encoding="utf-8")
    waveform_svg(OUT / "waveform-review.svg", tracks)
    preview_html(manifest)
    result = verify(manifest)
    print(json.dumps({k: result[k] for k in ("passed", "musicLoopCount", "sfxCount", "wavCountIncludingStems")}))


if __name__ == "__main__":
    main()
