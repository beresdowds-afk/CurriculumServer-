import { parseHundredths } from './weightedScore';

export interface PromotionSubjectRule {
  subjectId: string;
  compulsory: boolean;
  passPercentage: string;
}

export interface PromotionPolicy {
  minimumAverage: string;
  maximumFailedSubjects: number;
  subjects: readonly PromotionSubjectRule[];
  remedial?: {
    minimumAverage: string;
    maximumFailedSubjects: number;
    allowFailedCompulsory: boolean;
  };
}

export interface PromotionSubjectResult {
  subjectId: string;
  percentage: string;
  source: 'official' | 'mock';
}

export interface PromotionRecommendation {
  recommendation: 'promote' | 'remedial' | 'repeat';
  average: string;
  failedSubjectIds: string[];
  failedCompulsorySubjectIds: string[];
  basis: {
    policy: PromotionPolicy;
    results: PromotionSubjectResult[];
  };
}

function percentage(value: string, label: string): bigint {
  const parsed = parseHundredths(value, label);
  if (parsed > 10000n) throw new Error(`${label} must not exceed 100.`);
  return parsed;
}

function failedLimit(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw new Error(`${label} must be an integer between 0 and 100.`);
  }
}

/**
 * Produces a recommendation only. Callers must establish that results are
 * official and authorized, persist the basis, and obtain the required approval.
 */
export function recommendPromotion(
  policy: PromotionPolicy,
  results: readonly PromotionSubjectResult[]
): PromotionRecommendation {
  const minimumAverage = percentage(policy.minimumAverage, 'Minimum average');
  failedLimit(policy.maximumFailedSubjects, 'Maximum failed subjects');
  if (!Array.isArray(policy.subjects) || policy.subjects.length === 0 || policy.subjects.length > 100) {
    throw new Error('A promotion policy must specify between 1 and 100 subjects.');
  }

  const rules = new Map<string, { compulsory: boolean; pass: bigint }>();
  for (const subject of policy.subjects) {
    if (typeof subject.subjectId !== 'string' || !subject.subjectId.trim() || rules.has(subject.subjectId) ||
        typeof subject.compulsory !== 'boolean') {
      throw new Error('Promotion subject rules must have unique IDs and a compulsory status.');
    }
    rules.set(subject.subjectId, {
      compulsory: subject.compulsory,
      pass: percentage(subject.passPercentage, `Pass percentage for ${subject.subjectId}`)
    });
  }

  let remedialMinimum: bigint | undefined;
  if (policy.remedial) {
    remedialMinimum = percentage(policy.remedial.minimumAverage, 'Remedial minimum average');
    failedLimit(policy.remedial.maximumFailedSubjects, 'Remedial maximum failed subjects');
    if (remedialMinimum > minimumAverage ||
        policy.remedial.maximumFailedSubjects < policy.maximumFailedSubjects ||
        typeof policy.remedial.allowFailedCompulsory !== 'boolean') {
      throw new Error('Remedial conditions must not be stricter than the promotion policy.');
    }
  }

  const found = new Set<string>();
  const failedSubjectIds: string[] = [];
  const failedCompulsorySubjectIds: string[] = [];
  let sum = 0n;
  for (const result of results) {
    const rule = rules.get(result.subjectId);
    if (!rule || found.has(result.subjectId)) throw new Error('Results contain an unknown or duplicate subject.');
    if (result.source !== 'official') throw new Error('Only official results may be used for a promotion recommendation.');
    const score = percentage(result.percentage, `Result for ${result.subjectId}`);
    found.add(result.subjectId);
    sum += score;
    if (score < rule.pass) {
      failedSubjectIds.push(result.subjectId);
      if (rule.compulsory) failedCompulsorySubjectIds.push(result.subjectId);
    }
  }
  for (const [subjectId, rule] of rules) {
    if (rule.compulsory && !found.has(subjectId)) throw new Error(`Missing compulsory result for ${subjectId}.`);
  }
  if (!found.size) throw new Error('At least one result is required.');

  const count = BigInt(found.size);
  const qualifies = sum >= minimumAverage * count &&
    failedSubjectIds.length <= policy.maximumFailedSubjects && failedCompulsorySubjectIds.length === 0;
  const remedial = policy.remedial;
  const qualifiesForRemedial = remedial && remedialMinimum !== undefined &&
    sum >= remedialMinimum * count && failedSubjectIds.length <= remedial.maximumFailedSubjects &&
    (remedial.allowFailedCompulsory || failedCompulsorySubjectIds.length === 0);
  const roundedAverage = (sum * 2n + count) / (count * 2n);
  return {
    recommendation: qualifies ? 'promote' : qualifiesForRemedial ? 'remedial' : 'repeat',
    average: `${roundedAverage / 100n}.${(roundedAverage % 100n).toString().padStart(2, '0')}`,
    failedSubjectIds,
    failedCompulsorySubjectIds,
    basis: {
      policy: {
        minimumAverage: policy.minimumAverage,
        maximumFailedSubjects: policy.maximumFailedSubjects,
        subjects: policy.subjects.map(subject => ({ ...subject })),
        ...(policy.remedial ? { remedial: { ...policy.remedial } } : {})
      },
      results: results.map(result => ({ ...result }))
    }
  };
}
