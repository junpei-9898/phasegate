/**
 * @layer domain
 * @unit phase-dependency-model
 */

import { describe, expect, it } from 'vitest';

import { FULL_STORY_REFLECTION_DEFAULTS } from '../../../phase-dependency-model/domain/definitions/full-story-reflection-defaults.js';
import { MINIMAL_STORY_REFLECTION_DEFAULTS } from '../../../phase-dependency-model/domain/definitions/minimal-story-reflection-defaults.js';
import { STANDARD_STORY_REFLECTION_DEFAULTS } from '../../../phase-dependency-model/domain/definitions/standard-story-reflection-defaults.js';

describe('full storyReflection デフォルト', () => {
  it('enabled が true である', () => {
    // Arrange
    const config = FULL_STORY_REFLECTION_DEFAULTS;

    // Act
    const result = config.enabled;

    // Assert
    expect(result).toBe(true);
  });

  it('3 つの mappings を持つ', () => {
    // Arrange
    const config = FULL_STORY_REFLECTION_DEFAULTS;

    // Act
    const result = config.mappings.length;

    // Assert
    expect(result).toBe(3);
  });

  it('logical_design と domain_model は required: true', () => {
    // Arrange
    const config = FULL_STORY_REFLECTION_DEFAULTS;

    // Act
    const logicalDesign = config.mappings.find((m) => m.inception.includes('logical_design'));
    const domainModel = config.mappings.find((m) => m.inception.includes('domain_model'));

    // Assert
    expect(logicalDesign?.required).toBe(true);
    expect(domainModel?.required).toBe(true);
  });

  it('uiux_design は required: false', () => {
    // Arrange
    const config = FULL_STORY_REFLECTION_DEFAULTS;

    // Act
    const uiuxDesign = config.mappings.find((m) => m.inception.includes('uiux_design'));

    // Assert
    expect(uiuxDesign?.required).toBe(false);
  });
});

describe('standard storyReflection デフォルト', () => {
  it('enabled が true である', () => {
    // Arrange
    const config = STANDARD_STORY_REFLECTION_DEFAULTS;

    // Act
    const result = config.enabled;

    // Assert
    expect(result).toBe(true);
  });

  it('2 つの mappings を持つ', () => {
    // Arrange
    const config = STANDARD_STORY_REFLECTION_DEFAULTS;

    // Act
    const result = config.mappings.length;

    // Assert
    expect(result).toBe(2);
  });

  it('logical_design は required: true', () => {
    // Arrange
    const config = STANDARD_STORY_REFLECTION_DEFAULTS;

    // Act
    const logicalDesign = config.mappings.find((m) => m.inception.includes('logical_design'));

    // Assert
    expect(logicalDesign?.required).toBe(true);
  });

  it('domain_model は required: false', () => {
    // Arrange
    const config = STANDARD_STORY_REFLECTION_DEFAULTS;

    // Act
    const domainModel = config.mappings.find((m) => m.inception.includes('domain_model'));

    // Assert
    expect(domainModel?.required).toBe(false);
  });
});

describe('minimal storyReflection デフォルト', () => {
  it('enabled が false である', () => {
    // Arrange
    const config = MINIMAL_STORY_REFLECTION_DEFAULTS;

    // Act
    const result = config.enabled;

    // Assert
    expect(result).toBe(false);
  });

  it('mappings が空である', () => {
    // Arrange
    const config = MINIMAL_STORY_REFLECTION_DEFAULTS;

    // Act
    const result = config.mappings.length;

    // Assert
    expect(result).toBe(0);
  });
});
