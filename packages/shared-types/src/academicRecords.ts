export interface AssessmentComponent {
  id: string;
  maximum: string;
  weightBasisPoints: number;
}

export const DEFAULT_ASSESSMENT_COMPONENTS: readonly AssessmentComponent[] = Object.freeze([
  Object.freeze({ id: 'ca1', maximum: '20', weightBasisPoints: 2000 }),
  Object.freeze({ id: 'ca2', maximum: '20', weightBasisPoints: 2000 }),
  Object.freeze({ id: 'exam', maximum: '60', weightBasisPoints: 6000 })
]);
