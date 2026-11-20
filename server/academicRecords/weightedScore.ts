import type { AssessmentComponent } from '../../packages/shared-types/src/academicRecords';
export { DEFAULT_ASSESSMENT_COMPONENTS } from '../../packages/shared-types/src/academicRecords';

export interface AssessmentScore {
  componentId: string;
  score: string | null;
}

export function parseHundredths(value: string, field: string): bigint {
  if (typeof value !== 'string' || !/^\d{1,6}(?:\.\d{1,2})?$/.test(value)) {
    throw new Error(`${field} must be a non-negative decimal with at most two decimal places.`);
  }
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

function gcd(a: bigint, b: bigint): bigint {
  while (b !== 0n) {
    [a, b] = [b, a % b];
  }
  return a;
}

/**
 * Returns a percentage rounded half up to two decimal places. This function
 * performs no authorization or persistence; callers must enforce both.
 */
export function calculateWeightedScore(
  components: readonly AssessmentComponent[],
  scores: readonly AssessmentScore[]
): string {
  if (components.length === 0 || components.length > 100) {
    throw new Error('An assessment must have between 1 and 100 components.');
  }
  const componentIds = new Set<string>();
  let totalWeight = 0;
  for (const component of components) {
    if (!component.id.trim() || componentIds.has(component.id)) {
      throw new Error('Assessment component IDs must be non-empty and unique.');
    }
    componentIds.add(component.id);
    if (!Number.isInteger(component.weightBasisPoints) || component.weightBasisPoints <= 0 ||
        component.weightBasisPoints > 10000) {
      throw new Error(`Invalid weight for ${component.id}.`);
    }
    if (parseHundredths(component.maximum, `Maximum for ${component.id}`) === 0n) {
      throw new Error(`Maximum for ${component.id} must be greater than zero.`);
    }
    totalWeight += component.weightBasisPoints;
  }
  if (totalWeight !== 10000) {
    throw new Error('Assessment weights must total 10000 basis points.');
  }

  const scoresByComponent = new Map<string, string | null>();
  for (const entry of scores) {
    if (!componentIds.has(entry.componentId) || scoresByComponent.has(entry.componentId)) {
      throw new Error(`Unknown or duplicate assessment score: ${entry.componentId}.`);
    }
    scoresByComponent.set(entry.componentId, entry.score);
  }

  let numerator = 0n;
  let denominator = 1n;
  for (const component of components) {
    const rawScore = scoresByComponent.get(component.id);
    if (rawScore == null) {
      throw new Error(`Missing score for ${component.id}.`);
    }
    const score = parseHundredths(rawScore, `Score for ${component.id}`);
    const maximum = parseHundredths(component.maximum, `Maximum for ${component.id}`);
    if (score > maximum) {
      throw new Error(`Score for ${component.id} exceeds its maximum.`);
    }
    numerator = numerator * maximum + score * BigInt(component.weightBasisPoints) * denominator;
    denominator *= maximum;
    const divisor = gcd(numerator, denominator);
    numerator /= divisor;
    denominator /= divisor;
  }

  const rounded = (numerator * 2n + denominator) / (denominator * 2n);
  return `${rounded / 100n}.${(rounded % 100n).toString().padStart(2, '0')}`;
}
