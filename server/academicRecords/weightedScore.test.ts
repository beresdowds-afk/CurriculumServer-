import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { calculateWeightedScore, DEFAULT_ASSESSMENT_COMPONENTS } from './weightedScore';

test('default CA and examination scores produce a 40/60 weighted total', () => {
  assert.equal(calculateWeightedScore(DEFAULT_ASSESSMENT_COMPONENTS, [
    { componentId: 'ca1', score: '15' },
    { componentId: 'ca2', score: '18' },
    { componentId: 'exam', score: '45' }
  ]), '78.00');
  assert.equal(calculateWeightedScore(DEFAULT_ASSESSMENT_COMPONENTS, [
    { componentId: 'ca1', score: '20' },
    { componentId: 'ca2', score: '20' },
    { componentId: 'exam', score: '60' }
  ]), '100.00');
});

test('configurable weights use exact arithmetic and round only the final total', () => {
  const components = [
    { id: 'coursework', maximum: '32', weightBasisPoints: 5000 },
    { id: 'exam', maximum: '32', weightBasisPoints: 5000 }
  ];
  assert.equal(calculateWeightedScore(components, [
    { componentId: 'coursework', score: '1' },
    { componentId: 'exam', score: '1' }
  ]), '3.13');
  assert.equal(calculateWeightedScore(components, [
    { componentId: 'coursework', score: '0' },
    { componentId: 'exam', score: '0' }
  ]), '0.00');
});

test('missing, duplicate, unknown, malformed and out-of-range scores are rejected', () => {
  const valid = [
    { componentId: 'ca1', score: '10' },
    { componentId: 'ca2', score: '10' },
    { componentId: 'exam', score: '30' }
  ];
  assert.throws(() => calculateWeightedScore(DEFAULT_ASSESSMENT_COMPONENTS, valid.slice(1)), /Missing score/);
  assert.throws(() => calculateWeightedScore(DEFAULT_ASSESSMENT_COMPONENTS, [...valid, valid[0]]), /duplicate/);
  assert.throws(() => calculateWeightedScore(DEFAULT_ASSESSMENT_COMPONENTS, [...valid, { componentId: 'other', score: '0' }]), /Unknown/);
  for (const score of [null, '-1', '20.001', 'NaN', '21']) {
    assert.throws(() => calculateWeightedScore(DEFAULT_ASSESSMENT_COMPONENTS, [{ ...valid[0], score }, ...valid.slice(1)]));
  }
});

test('invalid configurations are rejected', () => {
  const score = [{ componentId: 'a', score: '0' }];
  assert.throws(() => calculateWeightedScore([], []), /between/);
  assert.throws(() => calculateWeightedScore([{ id: 'a', maximum: '0', weightBasisPoints: 10000 }], score), /greater than zero/);
  assert.throws(() => calculateWeightedScore([{ id: 'a', maximum: '10', weightBasisPoints: 9999 }], score), /total/);
  assert.throws(() => calculateWeightedScore([
    { id: 'a', maximum: '10', weightBasisPoints: 5000 },
    { id: 'a', maximum: '10', weightBasisPoints: 5000 }
  ], score), /unique/);
});
