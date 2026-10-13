import {
  BufferAttribute,
  BufferGeometry,
  Matrix4,
  Mesh,
  type Material,
  type Object3D,
} from "@iwsdk/core";

const ATTRIBUTES = ["position", "normal", "uv"] as const;

function sliceVertices(geometry: BufferGeometry, start: number, count: number): BufferGeometry {
  const part = new BufferGeometry();
  for (const name of ATTRIBUTES) {
    const source = geometry.getAttribute(name);
    const size = name === "uv" ? 2 : 3;
    const values = source
      ? (source.array as Float32Array).slice(start * size, (start + count) * size)
      : new Float32Array(count * size);
    part.setAttribute(name, new BufferAttribute(values, size));
  }
  return part;
}

function concatenate(parts: BufferGeometry[]): BufferGeometry {
  const merged = new BufferGeometry();
  for (const name of ATTRIBUTES) {
    const size = name === "uv" ? 2 : 3;
    const total = parts.reduce((sum, part) => sum + part.getAttribute(name).count, 0);
    const values = new Float32Array(total * size);
    let offset = 0;
    for (const part of parts) {
      const array = part.getAttribute(name).array as Float32Array;
      values.set(array, offset);
      offset += array.length;
    }
    merged.setAttribute(name, new BufferAttribute(values, size));
  }
  merged.computeBoundingSphere();
  return merged;
}

/**
 * Replaces the static meshes under `root` with one mesh per material, keeping their transforms
 * relative to `root`. Subtrees listed in `keep` stay live (they move independently).
 * Cuts draw calls for the headset without changing what is rendered.
 */
export function bakeStatic(root: Object3D, keep: ReadonlySet<Object3D> = new Set()): void {
  root.updateMatrixWorld(true);
  const toRoot = new Matrix4().copy(root.matrixWorld).invert();
  const meshes: Mesh[] = [];
  const visit = (object: Object3D) => {
    if (keep.has(object)) return;
    if ((object as Mesh).isMesh) meshes.push(object as Mesh);
    object.children.forEach(visit);
  };
  root.children.forEach(visit);

  const buckets = new Map<Material, BufferGeometry[]>();
  for (const mesh of meshes) {
    const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    geometry.applyMatrix4(new Matrix4().multiplyMatrices(toRoot, mesh.matrixWorld));
    const vertexCount = geometry.getAttribute("position").count;
    // Built-in geometries carry face groups (box sides, cylinder caps); they only select
    // materials when the mesh has a material array.
    const materials = Array.isArray(mesh.material) ? mesh.material : null;
    const groups =
      materials && geometry.groups.length
        ? geometry.groups
        : [{ start: 0, count: vertexCount, materialIndex: 0 }];
    for (const group of groups) {
      const material = materials
        ? materials[Math.min(group.materialIndex ?? 0, materials.length - 1)]!
        : (mesh.material as Material);
      const count = Math.min(group.count, vertexCount - group.start);
      const bucket = buckets.get(material) ?? [];
      bucket.push(sliceVertices(geometry, group.start, count));
      buckets.set(material, bucket);
    }
  }

  for (const mesh of meshes) mesh.removeFromParent();
  const prune = (object: Object3D) => {
    if (keep.has(object)) return;
    [...object.children].forEach(prune);
    if (
      object !== root &&
      !keep.has(object) &&
      object.children.length === 0 &&
      !(object as Mesh).isMesh
    ) {
      object.removeFromParent();
    }
  };
  prune(root);
  for (const [material, parts] of buckets) root.add(new Mesh(concatenate(parts), material));
}
