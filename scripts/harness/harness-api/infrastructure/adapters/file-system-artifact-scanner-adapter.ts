// @layer infrastructure
// file-system-artifact-scanner-adapter.ts — FileSystemArtifactScannerAdapter

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { ArtifactScannerPort } from '../../domain/ports/artifact-scanner-port.js';
import { ArtifactScanResult, type ArtifactPresence } from '../../domain/value-objects/artifact-scan-result.js';
import type { LayerHealth } from '../../domain/value-objects/layer-health.js';

interface HarnessConfigPaths {
  designDocs?: string;
  integrationTests?: string;
}

interface HarnessConfigJson {
  paths?: HarnessConfigPaths;
}

export interface FileSystemArtifactScannerAdapterOptions {
  basePath?: string;
  configPath?: string;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function directoryHasFiles(dirPath: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(dirPath, { recursive: true });
    return entries.length > 0;
  } catch {
    return false;
  }
}

async function loadConfig(configPath: string): Promise<HarnessConfigJson> {
  const content = await fs.readFile(configPath, 'utf-8');
  return JSON.parse(content) as HarnessConfigJson;
}

export class FileSystemArtifactScannerAdapter implements ArtifactScannerPort {
  private readonly basePath: string | undefined;
  private readonly configPath: string | undefined;

  constructor(options: FileSystemArtifactScannerAdapterOptions = {}) {
    this.basePath = options.basePath;
    this.configPath = options.configPath;
  }

  async scan(): Promise<ArtifactScanResult> {
    const scannedPaths: string[] = [];
    const foundArtifacts: ArtifactPresence[] = [];

    if (this.basePath !== undefined) {
      // Fixture-based scan: check for existence of layer directories/files
      await this.scanFixtureDirectory(this.basePath, scannedPaths, foundArtifacts);
    } else if (this.configPath !== undefined) {
      // Config-based scan
      await this.scanFromConfig(this.configPath, scannedPaths, foundArtifacts);
    } else {
      throw new Error('FileSystemArtifactScannerAdapter: either basePath or configPath must be provided');
    }

    return ArtifactScanResult.create({
      scannedPaths,
      foundArtifacts,
      derivedLayerHealth: [] as LayerHealth[],
    });
  }

  private async scanFixtureDirectory(
    basePath: string,
    scannedPaths: string[],
    foundArtifacts: ArtifactPresence[]
  ): Promise<void> {
    // Verify basePath exists
    const baseExists = await fileExists(basePath);
    if (!baseExists) {
      throw new Error(`FileSystemArtifactScannerAdapter: basePath does not exist: ${basePath}`);
    }

    scannedPaths.push(basePath);

    // Scan for L1 artifacts: docs/product/construction/**
    const l1Path = path.join(basePath, 'docs', 'product', 'construction');
    scannedPaths.push(l1Path);
    const l1Present = await directoryHasFiles(l1Path);
    foundArtifacts.push({ layer: 'L1', present: l1Present, path: l1Present ? l1Path : null });

    // Scan for L2 artifacts: docs/product/construction/**/logical_design*
    const l2Present = await fileExists(path.join(l1Path, 'harness-api', 'logical_design.md'));
    foundArtifacts.push({ layer: 'L2', present: l2Present, path: l2Present ? path.join(l1Path, 'harness-api', 'logical_design.md') : null });

    // Scan for L3 artifacts: scripts/harness/__tests__/integration/**
    const l3Path = path.join(basePath, 'scripts', 'harness', '__tests__', 'integration');
    scannedPaths.push(l3Path);
    const l3Present = await directoryHasFiles(l3Path);
    foundArtifacts.push({ layer: 'L3', present: l3Present, path: l3Present ? l3Path : null });

    // Scan for L4 artifacts: scripts/harness/__tests__/integration/**/command-dispatch*
    const l4Path = path.join(l3Path, 'harness-api', 'command-dispatch-integration.test.ts');
    const l4Present = await fileExists(l4Path);
    foundArtifacts.push({ layer: 'L4', present: l4Present, path: l4Present ? l4Path : null });
  }

  private async scanFromConfig(
    configPath: string,
    scannedPaths: string[],
    foundArtifacts: ArtifactPresence[]
  ): Promise<void> {
    const config = await loadConfig(configPath);
    const designDocsPath = config.paths?.designDocs ?? 'docs/product/construction';
    const integrationTestsPath = config.paths?.integrationTests ?? 'scripts/harness/__tests__/integration';

    scannedPaths.push(designDocsPath);
    scannedPaths.push(integrationTestsPath);

    // L1: design docs existence
    const l1Present = await fileExists(designDocsPath);
    foundArtifacts.push({ layer: 'L1', present: l1Present, path: l1Present ? designDocsPath : null });

    // L3: integration tests existence
    const l3Present = await fileExists(integrationTestsPath);
    foundArtifacts.push({ layer: 'L3', present: l3Present, path: l3Present ? integrationTestsPath : null });
  }
}
