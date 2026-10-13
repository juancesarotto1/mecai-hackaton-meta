export interface AssetManifestPart {
  id: string;
  meshNodes: string[];
  pivotM: [number, number, number];
  removable: boolean;
}
export interface AssetValidation {
  valid: boolean;
  errors: string[];
}
export function validateAssetManifest(parts: AssetManifestPart[]): AssetValidation {
  const errors: string[] = [];
  const ids = new Set<string>();
  const nodes = new Set<string>();
  for (const part of parts) {
    if (!/^[a-z0-9-]+$/.test(part.id)) errors.push(`Invalid part id: ${part.id}`);
    if (ids.has(part.id)) errors.push(`Duplicate part id: ${part.id}`);
    ids.add(part.id);
    if (part.meshNodes.length === 0) errors.push(`No mesh nodes for: ${part.id}`);
    for (const node of part.meshNodes) {
      if (nodes.has(node)) errors.push(`Mesh node assigned twice: ${node}`);
      nodes.add(node);
    }
    if (part.pivotM.some((value) => !Number.isFinite(value)))
      errors.push(`Invalid pivot for: ${part.id}`);
  }
  return { valid: errors.length === 0, errors };
}
