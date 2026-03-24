/**
 * @layer presentation
 * @unit nyquist-validation
 */

export interface CliRenderOptions {
  readonly format: 'human' | 'agent' | 'json';
  readonly verbose: boolean;
  readonly color: boolean;
}

// @story-id H08-07