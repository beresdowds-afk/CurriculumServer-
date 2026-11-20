import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { recommendPromotion, type PromotionPolicy, type PromotionSubjectResult } from './promotionRecommendation';

const policy: PromotionPolicy = {
  minimumAverage: '50',
  maximumFailedSubjects: 1,
  subjects: [
    { subjectId: 'math', compulsory: true, passPercentage: '50' },
    { subjectId: 'english', compulsory: true, passPercentage: '50' },
    { subjectId: 'art', compulsory: false, passPercentage: '40' }
  ],
  remedial: { minimumAverage: '45', maximumFailedSubjects: 2, allowFailedCompulsory: true }
};

const results: PromotionSubjectResult[] = [
  { subjectId: 'math', percentage: '60', source: 'official' },
  { subjectId: 'english', percentage: '50', source: 'official' },
  { subjectId: 'art', percentage: '39', source: 'official' }
];

test('recommendation uses the exact average and captures a separate calculation basis', () => {
  const evaluated = recommendPromotion(policy, results);
  assert.equal(evaluated.average, '49.67');
  assert.equal(evaluated.recommendation, 'remedial');
  assert.deepEqual(evaluated.failedSubjectIds, ['art']);
  const passing = recommendPromotion(policy, results.slice(0, 2));
  assert.equal(passing.recommendation, 'promote');
  assert.notStrictEqual(passing.basis.policy.subjects[0], policy.subjects[0]);
  assert.notStrictEqual(passing.basis.results[0], results[0]);
});

test('failed compulsory subjects cannot be promoted even when aggregate and failure limit pass', () => {
  const evaluated = recommendPromotion(policy, [
    { subjectId: 'math', percentage: '49', source: 'official' },
    { subjectId: 'english', percentage: '80', source: 'official' }
  ]);
  assert.equal(evaluated.recommendation, 'remedial');
  assert.deepEqual(evaluated.failedCompulsorySubjectIds, ['math']);
  assert.equal(recommendPromotion({ ...policy, remedial: undefined }, evaluated.basis.results).recommendation, 'repeat');
});

test('missing compulsory subjects, duplicate or mock results and invalid policy are rejected', () => {
  assert.throws(() => recommendPromotion(policy, results.slice(1)), /Missing compulsory/);
  assert.throws(() => recommendPromotion(policy, [...results, results[0]]), /duplicate/);
  assert.throws(() => recommendPromotion(policy, [{ ...results[0], source: 'mock' }, results[1]]), /Only official/);
  assert.throws(() => recommendPromotion(policy, [{ ...results[0], percentage: '100.01' }, results[1]]), /must not exceed/);
  assert.throws(() => recommendPromotion({ ...policy, minimumAverage: '101' }, results), /must not exceed/);
});

test('threshold decisions use the unrounded average', () => {
  const precisePolicy: PromotionPolicy = {
    minimumAverage: '50', maximumFailedSubjects: 0,
    subjects: [
      { subjectId: 'a', compulsory: true, passPercentage: '0' },
      { subjectId: 'b', compulsory: true, passPercentage: '0' },
      { subjectId: 'c', compulsory: true, passPercentage: '0' }
    ]
  };
  const evaluated = recommendPromotion(precisePolicy, [
    { subjectId: 'a', percentage: '50', source: 'official' },
    { subjectId: 'b', percentage: '50', source: 'official' },
    { subjectId: 'c', percentage: '49.99', source: 'official' }
  ]);
  assert.equal(evaluated.average, '50.00');
  assert.equal(evaluated.recommendation, 'repeat');
});
