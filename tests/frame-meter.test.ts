import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FrameMeter } from '../src/client/frame-meter.ts';

test('bounded render capture waits for actual hostile images and freezes before post-stress', () => {
  const meter = new FrameMeter();
  meter.beginCapture(100, 4000);
  meter.sample(10, true, 20);
  assert.equal(meter.summary().capture?.state, 'armed');
  meter.sample(20, true, 4000);
  for (let time = 30; time <= 120; time += 10) meter.sample(time, true, 4000);
  meter.sample(1000, true, 0);
  const result = meter.summary();
  assert.equal(result.capture?.state, 'complete');
  assert.equal(result.intervalWindowMs, 100);
  assert.equal(result.averageFps, 100);
  assert.equal(result.sampleHostilesMin, 4000);
  assert.equal(result.framesBelowRequiredHostiles, 0);
});

test('render capture reports a count drop or hidden frame instead of masking it', () => {
  const meter = new FrameMeter();
  meter.beginCapture(100, 4000);
  meter.sample(10, true, 4000);
  meter.sample(60, false, 3999);
  meter.sample(110, true, 4000);
  assert.equal(meter.summary().sampleHostilesMin, 3999);
  assert.equal(meter.summary().framesBelowRequiredHostiles, 1);
  assert.equal(meter.summary().hiddenFrames, 1);
});
