"""Original editable boss scores. No samples or external music service.
Circular synthesis wraps complete notes and room tails across the loop seam.
Run this file from tools/ to regenerate; --verify-only checks delivered PCM.
"""
from pathlib import Path
from runpy import run_path
import json, hashlib, sys, math, html
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
base=run_path(str(ROOT/'tools/synthesize-audio.py'))
RATE=base['RATE']; OUT=ROOT/'assets/production/audio/boss-themes'
THEMES=[
 {'bossId':'constable','id':'hollow-muster','title':'Hollow Muster','bpm':108,'beatsPerBar':4,'meter':'4/4','root':38,
  'roots':[0,0,-4,-2,0,3,7,0], 'motif':[0,0,7,3,2,0,-1,2], 'lead':'brass',
  'intent':'A stiff D-minor funeral march: low brass calls, clipped snare and squared bass. A four-bar answer opens the second half.'},
 {'bossId':'lantern-warden','id':'last-light','title':'Last Light','bpm':72,'beatsPerBar':3,'meter':'3/4','root':40,
  'roots':[0,-1,3,0,-5,-1,7,0], 'motif':[12,7,11,8,7,3,2,7], 'lead':'bells',
  'intent':'Sparse E-Phrygian bell waltz over slowly bowed fifths; long decays and open beats mirror the lantern sweep and rest.'},
 {'bossId':'courier','id':'undelivered','title':'Undelivered','bpm':144,'beatsPerBar':4,'meter':'4/4','root':45,
  'roots':[0,0,5,3,-2,-2,7,0], 'motif':[0,3,7,10,7,3,2,-1], 'lead':'pluck',
  'intent':'Hurried A-minor ostinato, pizzicato running eighths and syncopated rim taps. A rising counterline answers the descending delivery motif.'},
 {'bossId':'ratcatcher','id':'crooked-procession','title':'Crooked Procession','bpm':126,'beatsPerBar':3.5,'meter':'7/8','root':43,
  'roots':[0,-1,3,0,5,3,-1,0], 'motif':[12,13,7,10,6,7,3,1], 'lead':'reed',
  'intent':'A lopsided 2+2+3 G-Phrygian reed dance, plucked bass and dry wood taps. The asymmetric phrase keeps the packs restless without high-frequency chatter.'},
 {'bossId':'quarantine-clerk','id':'final-entry','title':'Final Entry','bpm':100,'beatsPerBar':5,'meter':'5/4','root':36,
  'roots':[0,3,-1,0,-5,-1,7,0], 'motif':[0,7,3,2,-1,0,10,7], 'lead':'keys',
  'intent':'A C-minor prepared-key ledger in 3+2, with a low stamping pulse and restrained rising harmonies. Three clipped answers leave a two-beat gap.'},
]
THEMES += [
 {'bossId':'tollkeeper','id':'copper-debt','title':'Copper Debt','bpm':94,'beatsPerBar':4,'meter':'4/4','root':38,
  'roots':[0,-2,3,0,5,3,-2,0], 'motif':[0,7,2,10,3,2,-2,0], 'lead':'keys',
  'intent':'D-minor counting ostinato on low prepared keys, a falling bronze-bell answer and a single offbeat wheel tap. Wide rests separate each return.'},
 {'bossId':'chain-marshal','id':'iron-jurisdiction','title':'Iron Jurisdiction','bpm':88,'beatsPerBar':6,'meter':'6/4','root':34,
  'roots':[0,0,1,-2,5,1,7,0], 'motif':[0,1,7,6,3,1,-2,0], 'lead':'brass',
  'intent':'B-flat Phrygian low-brass decree in six, two weighty three-beat chain phrases, bowed fifths and deep alternating toms. No relentless high percussion.'},
 {'bossId':'gate-widow','id':'third-latch','title':'Third Latch','bpm':66,'beatsPerBar':3,'meter':'3/4','root':40,
  'roots':[0,3,5,0,-2,3,7,0], 'motif':[12,7,3,2,0,-2,3,7], 'lead':'reed',
  'intent':'A restrained E-minor funeral waltz. A sustained reed line passes between three low key chords; the third latch falls silent before the next phrase.'},
 {'bossId':'black-ambulance','id':'last-carriage','title':'Last Carriage','bpm':156,'beatsPerBar':3,'meter':'6/8','root':42,'bars':32,
  'roots':[0,0,3,5,7,3,1,0], 'motif':[0,7,12,10,7,3,1,-1], 'lead':'pluck',
  'intent':'F-sharp minor carriage gallop in two groups of three eighths, muted strings, a distant single roof bell and a held driver phrase after each rush.'},
]

THEMES += [{'bossId': 'matron', 'id': 'cradle-ledger', 'title': 'Cradle Ledger', 'bpm': 62, 'beatsPerBar': 3, 'meter': '3/4', 'root': 41, 'roots': [0, 3, 5, 0, -2, 3, 7, 0], 'motif': [7, 3, 2, 0, -2, 2, 3, 0], 'lead': 'bells', 'arrangement': 'lullaby', 'intent': 'A spare F-minor cradle song, two low music-box notes answered by a single high bell. Bowed open fifths leave room around the nest tell.'}, {'bossId': 'alchemist', 'id': 'glasshouse-rot', 'title': 'Glasshouse Rot', 'bpm': 114, 'beatsPerBar': 2.5, 'bars': 24, 'meter': '5/8', 'root': 44, 'roots': [0, 1, 5, 0, 6, 1, 7, 0], 'motif': [0, 1, 6, 7, 3, 6, 1, -1], 'lead': 'keys', 'arrangement': 'droplets', 'intent': 'An uneven G-sharp Phrygian glass-key pattern in 2+3, dry droplets and an off-center plucked answer; short notes keep the ground warnings clear.'}, {'bossId': 'bellringer', 'id': 'late-warning', 'title': 'The Late Warning', 'bpm': 58, 'beatsPerBar': 4, 'meter': '4/4', 'root': 38, 'roots': [0, -5, 0, 3, -2, 0, 7, 0], 'motif': [0, 7, 12, 3, 2, 10, 7, 0], 'lead': 'bells', 'arrangement': 'bell-towers', 'intent': 'Four distant D-minor towers answer across a wide stereo field. Long low bell decays and a moving upper answer mark the deliberate rotating gap.'}, {'bossId': 'stitchwright', 'id': 'needle-debt', 'title': 'Needle Debt', 'bpm': 128, 'beatsPerBar': 3.5, 'bars': 24, 'meter': '7/8', 'root': 40, 'roots': [0, -1, 3, 5, 0, 7, -1, 0], 'motif': [0, 7, 1, 8, 3, 10, 1, -1], 'lead': 'reed', 'arrangement': 'sutures', 'intent': 'A tightening E-Phrygian reed stitch in 3+2+2. Paired short notes stretch into a held rescue phrase every fourth bar.'}, {'bossId': 'glass-surgeon', 'id': 'aperture', 'title': 'Aperture', 'bpm': 92, 'beatsPerBar': 5, 'meter': '5/4', 'root': 46, 'roots': [0, 1, 0, -4, 5, 1, 7, 0], 'motif': [12, 7, 1, 0, 8, 7, 3, 1], 'lead': 'keys', 'arrangement': 'polygon', 'intent': 'B-flat glass harmonics form three sides of a five-beat phrase; the fourth answer is an intentional rest, echoing the missing polygon edge.'}, {'bossId': 'ash-baker', 'id': 'oven-at-dawn', 'title': 'Oven at Dawn', 'bpm': 104, 'beatsPerBar': 4, 'meter': '4/4', 'root': 36, 'roots': [0, 0, 3, 5, 0, -2, 7, 0], 'motif': [0, 3, 7, 10, 7, 2, 3, 0], 'lead': 'brass', 'arrangement': 'embers', 'intent': 'Low C-minor oven brass moves in slow blocks while two light plucked crumbs answer each heavy note. Warm, dry percussion replaces a constant hiss.'}, {'bossId': 'sluice-keeper', 'id': 'watermark', 'title': 'Watermark', 'bpm': 78, 'beatsPerBar': 3, 'meter': '6/8', 'root': 43, 'roots': [0, 5, 3, 0, -2, 5, 7, 0], 'motif': [0, 7, 5, 3, 2, 0, -2, 3], 'lead': 'pluck', 'arrangement': 'tides', 'intent': 'A rocking G-minor current in two groups of three, alternating low/high plucks and slow bowed tides. The held middle register marks dry ground.'}, {'bossId': 'stationmaster', 'id': 'last-departure', 'title': 'Last Departure', 'bpm': 132, 'beatsPerBar': 4, 'meter': '4/4', 'root': 42, 'roots': [0, 0, 3, 7, 5, 3, 1, 0], 'motif': [0, 7, 0, 10, 3, 7, 1, -1], 'lead': 'keys', 'arrangement': 'signals', 'intent': 'F-sharp minor railway keys alternate left/right signal answers over a restrained four-beat rail pulse. A held departure tone follows every third stop.'}, {'bossId': 'lamplighter', 'id': 'unlit-wick', 'title': 'Unlit Wick', 'bpm': 68, 'beatsPerBar': 3, 'meter': '3/4', 'root': 45, 'roots': [0, -2, 3, 0, 5, 3, 7, 0], 'motif': [12, 7, 3, 2, 0, 7, 10, 3], 'lead': 'bells', 'arrangement': 'three-lights', 'intent': 'Three isolated A-minor lights, each answered in a different register. Quiet middle bars and barely struck toms let sanctuary warnings breathe.'}, {'bossId': 'anatomist', 'id': 'lecture-in-bone', 'title': 'Lecture in Bone', 'bpm': 112, 'beatsPerBar': 5, 'meter': '5/4', 'root': 37, 'roots': [0, 1, 3, 0, 5, 1, 7, 0], 'motif': [0, 1, 7, 3, 6, 1, 10, 0], 'lead': 'keys', 'arrangement': 'calipers', 'intent': 'Two opposed C-sharp prepared-key voices open then snap together, with one long space before the final beat. Dry wood taps suggest a lecture pointer.'}, {'bossId': 'plague-gardener', 'id': 'green-afterlife', 'title': 'Green Afterlife', 'bpm': 86, 'beatsPerBar': 3, 'meter': '6/8', 'root': 41, 'roots': [0, 5, 3, 0, -2, 5, 7, 0], 'motif': [0, 3, 5, 7, 10, 7, 5, 2], 'lead': 'reed', 'arrangement': 'roots', 'intent': 'A rising F-minor reed vine in six, answered by clipped pruning plucks. Its final phrase opens into a plain held fifth rather than adding decoration.'}, {'bossId': 'choir', 'id': 'three-names', 'title': 'Three Names', 'bpm': 64, 'beatsPerBar': 5, 'bars': 8, 'meter': '5/4', 'root': 39, 'roots': [0, -1, 3, 5, 0, 7, -1, 0], 'motif': [0, 7, 3, 10, 1, 8, 7, 0], 'lead': 'organ', 'arrangement': 'three-voices', 'intent': 'Three synthesized E-flat minor organ voices enter in offset turns, then resolve together. Each voice has its own register and stereo place, with no external vocal samples.'}, {'bossId': 'red-abbess', 'id': 'scarlet-vespers', 'title': 'Scarlet Vespers', 'bpm': 72, 'beatsPerBar': 5, 'meter': '5/4', 'root': 36, 'roots': [0, 5, 3, -2, 0, 7, 5, 0], 'motif': [7, 12, 10, 7, 3, 5, 2, 0], 'lead': 'organ', 'arrangement': 'vespers', 'intent': 'A slow C-minor organ prayer in five, two sanctuary voices answering a descending outside-in judgment line. Deep restrained bells arrive only at phrase boundaries.'}, {'bossId': 'vesper-judge', 'id': 'open-half', 'title': 'The Open Half', 'bpm': 96, 'beatsPerBar': 4, 'meter': '4/4', 'root': 35, 'roots': [0, 1, 0, 5, 3, 1, 7, 0], 'motif': [0, 7, 1, 8, 3, 10, 1, 0], 'lead': 'brass', 'arrangement': 'verdict', 'intent': 'A B-Phrygian split-gavel call alternates low left and high right brass phrases. A conspicuous recovery rest separates each verdict from its answer.'}]

THEMES += [{'bossId': 'pallbearer', 'id': 'shoulders-of-wood', 'title': 'Shoulders of Wood', 'bpm': 76, 'beatsPerBar': 4, 'meter': '4/4', 'root': 36, 'roots': [0, 0, -2, 3, 5, 0, 7, -2], 'motif': [0, 7, 3, 2, 0, -2, 5, 1], 'lead': 'brass', 'arrangement': 'pilgrimage-pallbearer', 'phrasing': [0, 0.12, 0.38, 0.5, 0.7, 0.88], 'answerEvery': 2, 'answerVoice': 'bells', 'phraseStride': 1, 'percussionAccent': [0, 0.66], 'intent': 'A heavy coffin-bearing C-minor procession: unequal low brass steps, a held wooden bass and a spare reed answer.'}, {'bossId': 'cinder-foreman', 'id': 'last-shift', 'title': 'Last Shift', 'bpm': 118, 'beatsPerBar': 3.5, 'meter': '7/8', 'root': 39, 'roots': [0, 1, 0, 5, 3, -1, 7, 0], 'motif': [0, 1, 7, 6, 3, 8, 1, -1], 'lead': 'brass', 'arrangement': 'pilgrimage-cinder-foreman', 'phrasing': [0, 0.14, 0.28, 0.57, 0.71, 0.85], 'answerEvery': 3, 'answerVoice': 'reed', 'phraseStride': 2, 'percussionAccent': [0, 0.5], 'intent': 'A clipped E-flat industrial count in 2+2+3, low furnace brass and dry offbeat metal-like keys.'}, {'bossId': 'canal-diver', 'id': 'under-the-lock', 'title': 'Under the Lock', 'bpm': 64, 'beatsPerBar': 3, 'meter': '6/8', 'root': 38, 'roots': [0, -2, 5, 0, 3, -5, 7, 0], 'motif': [7, 5, 3, 0, -2, 2, 10, 7], 'lead': 'reed', 'arrangement': 'pilgrimage-canal-diver', 'phrasing': [0, 0.16, 0.33, 0.5, 0.66, 0.83], 'answerEvery': 4, 'answerVoice': 'pluck', 'phraseStride': 3, 'percussionAccent': [0, 0.66], 'intent': 'An underwater D-minor rocking reed line, deep plucked pulses and a distant rising bell before resurfacing.'}, {'bossId': 'clockmender', 'id': 'borrowed-second', 'title': 'Borrowed Second', 'bpm': 112, 'beatsPerBar': 5, 'meter': '5/4', 'root': 40, 'roots': [0, -1, 3, 0, 6, 1, 7, 0], 'motif': [0, 7, 1, 8, 3, 2, 10, 1], 'lead': 'keys', 'arrangement': 'pilgrimage-clockmender', 'phrasing': [0, 0.08, 0.2, 0.32, 0.44, 0.52], 'answerEvery': 2, 'answerVoice': 'keys', 'phraseStride': 1, 'percussionAccent': [0, 0.5], 'intent': 'A mechanical five-beat key phrase stops early, leaving an audible held rest before its delayed bell answer.'}, {'bossId': 'wire-seamstress', 'id': 'hem-of-silence', 'title': 'Hem of Silence', 'bpm': 104, 'beatsPerBar': 3, 'meter': '3/4', 'root': 45, 'roots': [0, 5, 3, -2, 0, 1, 7, 0], 'motif': [12, 7, 3, 8, 2, 5, 1, 0], 'lead': 'pluck', 'arrangement': 'pilgrimage-wire-seamstress', 'phrasing': [0, 0.12, 0.33, 0.48, 0.67, 0.82], 'answerEvery': 3, 'answerVoice': 'organ', 'phraseStride': 2, 'percussionAccent': [0, 0.66], 'intent': 'A thin A-minor plucked seam crosses long quiet string planes, with paired notes opening a deliberate gap.'}, {'bossId': 'gravedigger', 'id': 'one-more-yard', 'title': 'One More Yard', 'bpm': 82, 'beatsPerBar': 4, 'meter': '4/4', 'root': 35, 'roots': [0, 0, 3, -2, 5, 3, 7, 0], 'motif': [0, 3, 2, -2, 7, 5, 1, 0], 'lead': 'brass', 'arrangement': 'pilgrimage-gravedigger', 'phrasing': [0, 0.2, 0.25, 0.5, 0.7, 0.75], 'answerEvery': 4, 'answerVoice': 'bells', 'phraseStride': 3, 'percussionAccent': [0, 0.5], 'intent': 'A low B-minor shovel rhythm: grounded brass, a short raised answer and a descending collapse cadence.'}, {'bossId': 'ink-notary', 'id': 'unclosed-line', 'title': 'The Unclosed Line', 'bpm': 96, 'beatsPerBar': 5, 'meter': '5/4', 'root': 42, 'roots': [0, 3, 1, 0, 5, -2, 7, 0], 'motif': [0, 1, 3, 7, 10, 6, 3, -1], 'lead': 'keys', 'arrangement': 'pilgrimage-ink-notary', 'phrasing': [0, 0.1, 0.3, 0.45, 0.6, 0.8], 'answerEvery': 2, 'answerVoice': 'reed', 'phraseStride': 1, 'percussionAccent': [0, 0.66], 'intent': 'An F-sharp prepared-key spiral travels upward through an uneven phrase and deliberately leaves its final corner open.'}, {'bossId': 'spore-beekeeper', 'id': 'hive-without-sun', 'title': 'Hive Without Sun', 'bpm': 108, 'beatsPerBar': 3.5, 'meter': '7/8', 'root': 41, 'roots': [0, 5, 1, 3, 0, -2, 7, 0], 'motif': [0, 5, 7, 1, 8, 3, 6, 2], 'lead': 'reed', 'arrangement': 'pilgrimage-spore-beekeeper', 'phrasing': [0, 0.14, 0.42, 0.57, 0.71, 0.92], 'answerEvery': 3, 'answerVoice': 'pluck', 'phraseStride': 2, 'percussionAccent': [0, 0.5], 'intent': 'A dry F-Phrygian reed hive, three restrained answering registers and no broadband swarm noise.'}, {'bossId': 'ice-custodian', 'id': 'white-corridor', 'title': 'White Corridor', 'bpm': 74, 'beatsPerBar': 4, 'meter': '4/4', 'root': 46, 'roots': [0, -2, 3, 5, 0, 3, 7, -1], 'motif': [12, 7, 2, 3, 10, 5, 1, 0], 'lead': 'bells', 'arrangement': 'pilgrimage-ice-custodian', 'phrasing': [0, 0.25, 0.38, 0.5, 0.75, 0.88], 'answerEvery': 4, 'answerVoice': 'keys', 'phraseStride': 3, 'percussionAccent': [0, 0.66], 'intent': 'B-flat glass bells hang above a low walking pulse; clean spaced notes imply slipperiness without high-frequency wash.'}, {'bossId': 'bridge-ferryman', 'id': 'two-crossings', 'title': 'Two Crossings', 'bpm': 90, 'beatsPerBar': 3, 'meter': '6/8', 'root': 43, 'roots': [0, 3, 5, 0, -5, 3, 7, 0], 'motif': [0, 7, 5, 2, -2, 3, 10, 7], 'lead': 'pluck', 'arrangement': 'pilgrimage-bridge-ferryman', 'phrasing': [0, 0.16, 0.33, 0.58, 0.66, 0.83], 'answerEvery': 2, 'answerVoice': 'organ', 'phraseStride': 1, 'percussionAccent': [0, 0.5], 'intent': 'G-minor pole strokes alternate left and right with a central held reed, a small musical crossing and return.'}, {'bossId': 'porcelain-mourner', 'id': 'first-hairline', 'title': 'First Hairline', 'bpm': 68, 'beatsPerBar': 3, 'meter': '3/4', 'root': 40, 'roots': [0, 3, -1, 5, 0, -2, 7, 0], 'motif': [12, 11, 7, 3, 2, 8, 1, 0], 'lead': 'bells', 'arrangement': 'pilgrimage-porcelain-mourner', 'phrasing': [0, 0.16, 0.42, 0.5, 0.75, 0.92], 'answerEvery': 3, 'answerVoice': 'bells', 'phraseStride': 2, 'percussionAccent': [0, 0.66], 'intent': 'A restrained E-minor mourning waltz, porcelain bell intervals and a quiet low key reply that separates the cracks.'}, {'bossId': 'boiler-tender', 'id': 'pressure-gauge', 'title': 'Pressure Gauge', 'bpm': 122, 'beatsPerBar': 4, 'meter': '4/4', 'root': 37, 'roots': [0, 1, 5, 0, 3, 6, 7, 0], 'motif': [0, 1, 6, 7, 3, 8, 2, -1], 'lead': 'brass', 'arrangement': 'pilgrimage-boiler-tender', 'phrasing': [0, 0.125, 0.375, 0.5, 0.625, 0.875], 'answerEvery': 4, 'answerVoice': 'reed', 'phraseStride': 3, 'percussionAccent': [0, 0.5], 'intent': 'C-sharp low brass pressure rises in measured steps, answered by a short valve-key release and a clear recovery rest.'}, {'bossId': 'mirror-undertaker', 'id': 'the-other-room', 'title': 'The Other Room', 'bpm': 80, 'beatsPerBar': 5, 'meter': '5/4', 'root': 44, 'roots': [0, -1, 3, 5, 0, 1, 7, 0], 'motif': [0, 7, 3, 1, 8, 6, 2, 10], 'lead': 'keys', 'arrangement': 'pilgrimage-mirror-undertaker', 'phrasing': [0, 0.2, 0.3, 0.5, 0.7, 0.9], 'answerEvery': 2, 'answerVoice': 'pluck', 'phraseStride': 1, 'percussionAccent': [0, 0.66], 'intent': 'A G-sharp mirrored key question and reversed-register answer, separated in time so the ghost phrase cannot mask a tell.'}, {'bossId': 'chalk-magistrate', 'id': 'erased-corner', 'title': 'Erased Corner', 'bpm': 100, 'beatsPerBar': 4, 'meter': '4/4', 'root': 38, 'roots': [0, 3, 0, -2, 5, 1, 7, 0], 'motif': [0, 7, 3, 2, 10, 5, 1, -1], 'lead': 'keys', 'arrangement': 'pilgrimage-chalk-magistrate', 'phrasing': [0, 0.125, 0.25, 0.5, 0.625, 0.75], 'answerEvery': 3, 'answerVoice': 'keys', 'phraseStride': 2, 'percussionAccent': [0, 0.5], 'intent': 'A square D-minor chalk decree whose fourth corner is a rest; low tom punctuation and a plain rising answer.'}, {'bossId': 'wire-harpist', 'id': 'three-tensions', 'title': 'Three Tensions', 'bars': 24, 'bpm': 116, 'beatsPerBar': 3, 'meter': '3/4', 'root': 41, 'roots': [0, 1, 5, 3, 0, -1, 7, 0], 'motif': [0, 7, 1, 8, 3, 10, 6, 2], 'lead': 'pluck', 'arrangement': 'pilgrimage-wire-harpist', 'phrasing': [0, 0.08, 0.33, 0.42, 0.67, 0.75], 'answerEvery': 4, 'answerVoice': 'organ', 'phraseStride': 3, 'percussionAccent': [0, 0.66], 'intent': 'Three F-Phrygian plucked string entries arrive in sequence, answered by one low bell rather than a dense arpeggio wash.'}, {'bossId': 'crow-shepherd', 'id': 'black-wing-count', 'title': 'Black Wing Count', 'bars': 24, 'bpm': 138, 'beatsPerBar': 3.5, 'meter': '7/8', 'root': 42, 'roots': [0, 3, 5, 1, 0, -2, 7, 0], 'motif': [0, 3, 7, 10, 6, 1, 8, 2], 'lead': 'reed', 'arrangement': 'pilgrimage-crow-shepherd', 'phrasing': [0, 0.14, 0.28, 0.5, 0.64, 0.86], 'answerEvery': 2, 'answerVoice': 'bells', 'phraseStride': 1, 'percussionAccent': [0, 0.5], 'intent': 'A brisk F-sharp reed flock in three separated gestures, with dry wooden wing-like taps and broad recovery spaces.'}, {'bossId': 'ledger-leech', 'id': 'unpaid-name', 'title': 'Unpaid Name', 'bpm': 92, 'beatsPerBar': 5, 'meter': '5/4', 'root': 36, 'roots': [0, -1, 0, 3, 5, 1, 7, 0], 'motif': [0, 1, 7, 3, 8, 2, 10, -1], 'lead': 'keys', 'arrangement': 'pilgrimage-ledger-leech', 'phrasing': [0, 0.1, 0.25, 0.5, 0.6, 0.85], 'answerEvery': 3, 'answerVoice': 'reed', 'phraseStride': 2, 'percussionAccent': [0, 0.66], 'intent': 'A C-Phrygian seal rhythm counts two short demands, then answers in a warm low register with space around each warning.'}, {'bossId': 'engine', 'id': 'mortuary-drive', 'title': 'Mortuary Drive', 'bpm': 126, 'beatsPerBar': 4, 'meter': '4/4', 'root': 34, 'roots': [0, 0, 1, 5, 3, -2, 7, 0], 'motif': [0, 1, 7, 6, 3, 10, 2, -2], 'lead': 'brass', 'arrangement': 'pilgrimage-engine', 'phrasing': [0, 0.125, 0.375, 0.5, 0.75, 0.875], 'answerEvery': 4, 'answerVoice': 'pluck', 'phraseStride': 3, 'percussionAccent': [0, 0.5], 'intent': 'A broad B-flat mortuary-machine ostinato, heavy piston brass and a higher exposed-core key answer at each fourth bar.'}, {'bossId': 'regent', 'id': 'the-water-remembers', 'title': 'The Water Remembers', 'bpm': 72, 'beatsPerBar': 5, 'meter': '5/4', 'root': 38, 'roots': [0, -2, 3, 5, 0, -1, 7, 0], 'motif': [7, 12, 10, 5, 3, 8, 2, 0], 'lead': 'organ', 'arrangement': 'pilgrimage-regent', 'phrasing': [0, 0.2, 0.3, 0.5, 0.7, 0.85], 'answerEvery': 2, 'answerVoice': 'keys', 'phraseStride': 1, 'percussionAccent': [0, 0.66], 'intent': 'A drowned D-minor royal organ phrase with a slow countercurrent in the lower voice, opening into a restrained bell return.'}, {'bossId': 'salt-patriarch', 'id': 'three-white-steps', 'title': 'Three White Steps', 'bpm': 84, 'beatsPerBar': 3, 'meter': '3/4', 'root': 39, 'roots': [0, 5, 1, 0, 3, -1, 7, 0], 'motif': [0, 7, 1, 8, 3, 10, 6, 2], 'lead': 'organ', 'arrangement': 'pilgrimage-salt-patriarch', 'phrasing': [0, 0.16, 0.33, 0.5, 0.66, 0.83], 'answerEvery': 3, 'answerVoice': 'organ', 'phraseStride': 2, 'percussionAccent': [0, 0.5], 'intent': 'Three E-flat Phrygian processional steps, spare organ pillars and an audible held gate between each descending response.'}]

def voice(kind,note,seconds):
 if kind=='bells':return base['bell'](note,max(1.8,seconds))
 if kind=='pluck':return base['pluck'](note,seconds)
 t=base['times'](seconds);freq=base['midi'](note)
 if kind=='organ':
  y=sum(g*np.sin(2*np.pi*freq*h*t) for h,g in [(1,.65),(2,.18),(3,.11),(4,.04)])
  return .4*y*base['envelope'](t,.12,.35)
 if kind=='reed':
  y=sum(np.sin(2*np.pi*freq*h*t+.15*h)/h**1.5 for h in (1,3,5,7))
  return .4*y*base['envelope'](t,.04,.13)*(1+.025*np.sin(2*np.pi*5*t))
 if kind=='brass':
  y=sum(np.sin(2*np.pi*freq*h*t)/h**1.8 for h in range(1,7))
  return .4*y*base['envelope'](t,.065,.18)
 if kind=='keys':
  y=sum(g*np.sin(2*np.pi*freq*r*t)*np.exp(-t/d) for r,g,d in [(1,1,.65),(2.004,.25,.3),(3.11,.14,.18)])
  return .5*y*base['envelope'](t,.006,.15)
 raise ValueError(kind)
def compose(theme):
 beats=theme['beatsPerBar']*theme.get('bars',16);n=round(RATE*beats*60/theme['bpm']);spb=n/RATE/beats
 rng=np.random.default_rng(20261023+theme['root'])
 buses={key:np.zeros((n,2)) for key in ['lead','strings','bass','percussion']};score=[]
 def add(bus,beat,note,length,gain,pan=0,kind=None):
  sec=length*spb
  if bus=='lead':v=voice(kind or theme['lead'],note,sec)
  elif bus=='strings':v=base['bowed'](note,sec,short=theme['bossId']=='courier')
  elif bus=='bass':v=base['pluck'](note,sec)
  else:v=base['drum'](note,rng)
  base['circular_add'](buses[bus],v,round(beat*spb*RATE),gain,pan)
  score.append({'bus':bus,'beat':beat,'note':note,'lengthBeats':length,'gain':gain,'pan':pan,'voice':kind or (theme['lead'] if bus=='lead' else bus)})
 barlen=theme['beatsPerBar'];root=theme['root']
 for bar in range(theme.get('bars',16)):
  at=bar*barlen;r=root+theme['roots'][bar%8]
  chord=[r+12,r+19,r+15] if bar%8!=6 else [r+12,r+19,r+16]
  for k,note in enumerate(chord):add('strings',at,note,barlen+.9,.13 if theme['bossId']=='lantern-warden' else .085,(-.45,0,.45)[k])
  add('bass',at,r,1.4,.3);add('bass',at+barlen-.75,r+7,.7,.19,.08)
  if theme['bossId']=='constable':
   for b in (0,2):add('percussion',at+b,'kick',.4,.3)
   for b in (1,3):add('percussion',at+b,'rim',.3,.26,-.12)
   if bar%4==3:
    for b in (3.25,3.5,3.75):add('percussion',at+b,'tick',.2,.14,.2)
   for b,i in [(0,0),(1.5,1),(2,2),(3,3)]:add('lead',at+b,root+24+theme['motif'][(bar*2+i)%8],.72,.27, -.18 if i%2 else .18)
  elif theme['bossId']=='lantern-warden':
   add('lead',at,root+24+theme['motif'][bar%8],3.8,.29,-.25 if bar%2 else .25)
   if bar%2: add('lead',at+2,root+19,.9,.1,-.1)
   if bar%4==0:add('percussion',at,'tom',.5,.13)
  elif theme['bossId']=='courier':
   for k in range(8):add('lead',at+k*.5,root+12+theme['motif'][(k+bar)%8],.42,.25 if k%2 else .3,-.23 if k%2 else .23)
   for b in (0,1.5,2.75):add('percussion',at+b,'kick',.4,.24)
   for b in (1,3):add('percussion',at+b,'rim',.2,.21,.15)
   if bar>=8:add('lead',at+2,root+36+[0,2,3,7][bar%4],1.25,.11,.32,kind='keys')
  elif theme['bossId']=='ratcatcher':
   for b,i in [(0,0),(.5,1),(1,2),(2,3),(2.5,4),(3,5)]:add('lead',at+b,root+12+theme['motif'][(i+bar)%8],.39 if b!=2 else .7,.23,-.2 if i%2 else .2)
   for b in (0,1,2):add('percussion',at+b,'rim',.2,.2)
   add('percussion',at+3,'tick',.2,.12,.3)
  elif theme['bossId']=='quarantine-clerk':
   for b,i in [(0,0),(1,1),(2,2),(3,3)]:add('lead',at+b,root+24+theme['motif'][(bar+i)%8],.7,.25,-.18 if i%2 else .18)
   for b in (0,1,2):add('percussion',at+b,'rim',.2,.21)
   add('percussion',at+3,'kick',.4,.31)
   if bar%4==3:add('lead',at+4,root+35,1.7,.12,.24,kind='bells')
  elif theme['bossId']=='tollkeeper':
   for b,i in [(0,0),(.75,1),(1.5,2),(2.5,3)]:add('lead',at+b,root+19+theme['motif'][(bar+i)%8],.48,.27,-.2 if i%2 else .2)
   add('lead',at+3,root+31+theme['motif'][bar%8],1.6,.11,.3,kind='bells')
   add('percussion',at,'tom',.4,.25);add('percussion',at+2.5,'rim',.2,.2)
  elif theme['bossId']=='chain-marshal':
   for b,i in [(0,0),(2,1),(3,2),(5,3)]:add('lead',at+b,root+12+theme['motif'][(bar+i)%8],1.55 if b in (0,3) else .55,.3,-.12 if i%2 else .12)
   for b in (0,3):add('percussion',at+b,'tom',.6,.35)
   for b in (2.5,5.5):add('percussion',at+b,'rim',.2,.18,.25)
  elif theme['bossId']=='gate-widow':
   add('lead',at,root+24+theme['motif'][bar%8],2.7,.25,(-.25,0,.25)[bar%3])
   for b in (0,1):add('lead',at+b,root+12+[0,3,7][(bar+b)%3],.9,.14,-.3,kind='keys')
   if bar%2==0:add('percussion',at,'tom',.4,.12)
  elif theme['bossId']=='black-ambulance':
   for k in range(6):add('lead',at+k*.5,root+12+theme['motif'][(bar*2+k)%8],.38,.25,-.22 if k%2 else .22)
   for b in (0,1.5):add('percussion',at+b,'kick',.4,.27)
   for b in (.5,1,2,2.5):add('percussion',at+b,'rim',.2,.15)
   if bar%4==0:add('lead',at,root+36,2.5,.12,.32,kind='bells')
  elif theme.get('arrangement','').startswith('pilgrimage-'):
   phrase=theme['motif'];stride=theme['phraseStride'];register=root+24
   for k,fraction in enumerate(theme['phrasing']):
    length=.28 if k%3 else .68
    add('lead',at+fraction*barlen,register+phrase[(bar*stride+k)%8],length,.22,(-.25,.25)[k%2])
   if bar%theme['answerEvery']==theme['answerEvery']-1:
    for k,fraction in enumerate([.35,.82]):add('lead',at+fraction*barlen,root+12+phrase[(7-bar+k)%8],1.2,.13,.3 if k else -.3,kind=theme['answerVoice'])
   for k,fraction in enumerate(theme['percussionAccent']):add('percussion',at+fraction*barlen,'tom' if k==0 else 'rim',.4,.16 if k==0 else .11)
  elif theme.get('arrangement'):
   arrangement=theme['arrangement'];phrase=theme['motif'];melody=root+24
   if arrangement=='lullaby':
    add('lead',at,melody+phrase[bar%8],2.6,.23,-.2);add('lead',at+1.5,root+19+phrase[(bar+2)%8],1.3,.16,.25)
    if bar%4==3:add('percussion',at+2,'tom',.4,.1)
   elif arrangement=='droplets':
    for k,b in enumerate([0,.5,1.5,2]):add('lead',at+b,melody+phrase[(bar+k)%8],.32,.24,(-.3,.3)[k%2])
    add('percussion',at+1,'rim',.2,.14)
   elif arrangement=='bell-towers':
    add('lead',at,root+12+phrase[bar%8],4.8,.27,-.4);add('lead',at+2,melody+phrase[(bar+3)%8],3.5,.21,.4)
    if bar%2:add('lead',at+3,root+31,2,.1,0)
   elif arrangement=='sutures':
    for k,b in enumerate([0,.5,1.5,2,2.5]):add('lead',at+b,melody+phrase[(bar*2+k)%8],1.4 if bar%4==3 and k==4 else .38,.24,(-.2,.2)[k%2])
    add('percussion',at,'rim',.2,.22);add('percussion',at+1.5,'tick',.2,.12)
   elif arrangement=='polygon':
    for k,b in enumerate([0,1.25,2.5]):add('lead',at+b,melody+phrase[(bar+k)%8],.65,.25,[-.35,0,.35][k])
    add('percussion',at,'tom',.5,.16)
   elif arrangement=='embers':
    add('lead',at,root+12+phrase[bar%8],1.7,.28,-.1)
    for k,b in enumerate([2,2.5]):add('lead',at+b,melody+phrase[(bar+k+2)%8],.4,.17,.25,kind='pluck')
    add('percussion',at,'kick',.5,.3);add('percussion',at+3,'rim',.2,.17)
   elif arrangement=='tides':
    for k in range(6):add('lead',at+k*.5,root+12+(12 if k%2 else 0)+phrase[(bar+k)%8],.65,.2,(-.25,.25)[k%2])
    if bar%2==0:add('percussion',at,'tom',.5,.16)
   elif arrangement=='signals':
    for k,b in enumerate([0,.75,2,2.75]):add('lead',at+b,melody+phrase[(bar*2+k)%8],.52,.25,(-.4,.4)[k%2])
    for b in [0,1.5,2,3.5]:add('percussion',at+b,'rim',.2,.16)
   elif arrangement=='three-lights':
    add('lead',at+(bar%3)*.5,root+19+[0,7,12][bar%3]+phrase[bar%8],2.8,.23,[-.4,0,.4][bar%3])
    if bar%4==0:add('percussion',at,'tom',.4,.09)
   elif arrangement=='calipers':
    for b,k in [(0,0),(.5,1),(1.5,2),(2,3)]:add('lead',at+b,melody+phrase[(bar+k)%8],.4,.22,-.3 if k<2 else .3)
    add('lead',at+4,root+12,.7,.2,0);add('percussion',at+4,'rim',.3,.26)
   elif arrangement=='roots':
    for k,b in enumerate([0,.5,1,2]):add('lead',at+b,melody+phrase[(bar+k)%8],.8,.23,-.2)
    add('lead',at+2.5,root+19,.4,.2,.25,kind='pluck');add('percussion',at,'tom',.5,.17)
   elif arrangement=='three-voices':
    for k in range(3):add('lead',at+k*.75,root+12+[0,7,12][k]+phrase[bar%8],2.5,.24,[-.4,0,.4][k])
    for k in range(2):add('lead',at+3.5+k*.5,root+19+phrase[(bar+2+k)%8],.65,.12,-.2 if k==0 else .2,kind='bells')
    add('percussion',at+4,'tom',.5,.14)
   elif arrangement=='vespers':
    add('lead',at,root+12+phrase[bar%8],4.5,.27,-.3);add('lead',at+2,melody+phrase[(bar+3)%8],2.8,.21,.3)
    if bar%4==0:add('lead',at+4,root+31,3,.12,.1,kind='bells')
   elif arrangement=='verdict':
    for k,b in enumerate([0,1]):add('lead',at+b,root+(12 if bar%2==0 else 24)+phrase[(bar+k)%8],.8,.29,-.4 if bar%2==0 else .4)
    add('percussion',at,'tom',.6,.32)
 for bus in buses:
  buses[bus]=base['circular_room'](buses[bus],.28 if bus=='lead' else .16)
 master=sum(buses.values());master-=master.mean(axis=0)
 master*=.68/max(abs(master).max(),1e-10)
 # Equal long-term RMS across bosses preserves room for warning cues.
 master*=min(1,.135/max(np.sqrt(np.mean(master**2)),1e-10))
 return master,score
def verify(manifest):
 results=[]
 for track in manifest['tracks']:
  m=base['metrics'](ROOT/track['path'],True)
  assert m['passed'] and m['sha256']==track['sha256'],track['id']
  results.append(m)
 assert len({t['sha256'] for t in manifest['tracks']})==len(THEMES)
 assert len({tuple((e['beat'],e['note'],e['bus']) for e in t['score']) for t in manifest['tracks']})==len(THEMES)
 report={'schemaVersion':1,'passed':True,'tracks':results,'distinctBossThemes':len(THEMES),'humanListeningAccepted':False,
  'sourceSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
  'limits':['Objective PCM/clipping/DC/seam verification only. Human listening, device playback and final perceptual mix remain open.']}
 (ROOT/'reviews/boss-themes-review.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
 return report
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 if '--verify-only' in sys.argv:
  manifest=json.loads((OUT/'library.json').read_text(encoding='utf8'));verify(manifest);print('All distinct boss themes verified.');return
 tracks=[]
 existing={t['bossId']:t for t in json.loads((OUT/'library.json').read_text(encoding='utf8'))['tracks']} if '--missing-only' in sys.argv and (OUT/'library.json').exists() else {}
 for theme in THEMES:
  if theme['bossId'] in existing and '--refresh='+theme['bossId'] not in sys.argv:
   previous=existing[theme['bossId']];assert hashlib.sha256((ROOT/previous['path']).read_bytes()).hexdigest()==previous['sha256'];tracks.append(previous);continue
  signal,score=compose(theme);path=OUT/(theme['id']+'.wav');base['write_wav'](path,signal)
  metrics=base['metrics'](path,True)
  tracks.append({**theme,**metrics,'score':score,'loopStartFrame':0,'loopEndFrameExclusive':len(signal),'loop':True})
  print(theme['id'],metrics['durationSeconds'],metrics['rmsDbfs'],flush=True)
 manifest={'schemaVersion':1,'originalComposition':True,'samplesUsed':False,'synthesisSource':'tools/compose-boss-themes.py',
  'sourceSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'tracks':tracks}
 (OUT/'library.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8');verify(manifest)
 cards=''.join('<article><h2>'+html.escape(t['title'])+'</h2><p>'+html.escape(t['bossId']+' · '+str(t['bpm'])+' BPM · '+t['meter'])+'</p><p>'+html.escape(t['intent'])+'</p><audio controls loop preload="none" src="'+t['id']+'.wav"></audio></article>' for t in tracks)
 (OUT/'preview.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Grave Accord · Boss Themes</title><style>body{background:#142b27;color:#e8dcc5;max-width:1000px;margin:40px auto;padding:24px;font:17px/1.6 Georgia}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}article{padding:24px;border:1px solid #63786c}h2{color:#d8b278}audio{width:100%}</style><h1>Watches of the city</h1><p>Original boss compositions. Play one at a time; objective audio checks passed, listening review remains open.</p><main>'+cards+'</main></html>',encoding='utf8')
if __name__=='__main__':main()
