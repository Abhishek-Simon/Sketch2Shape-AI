from pathlib import Path
import json
import struct

import numpy as np
import trimesh


def _add_vertex_color_material(glb):
    if len(glb) < 20 or glb[:4] != b"glTF":
        raise ValueError("Invalid GLB file")

    magic, version, length = struct.unpack_from("<4sII", glb)
    if version != 2 or length != len(glb):
        raise ValueError("Invalid GLB header")

    offset = 12
    chunks = []
    while offset < len(glb):
        if offset + 8 > len(glb):
            raise ValueError("Invalid GLB chunk header")
        size, kind = struct.unpack_from("<II", glb, offset)
        offset += 8
        data = glb[offset:offset + size]
        if len(data) != size:
            raise ValueError("Invalid GLB chunk size")
        chunks.append((kind, data))
        offset += size

    if not chunks or chunks[0][0] != 0x4E4F534A:
        raise ValueError("GLB JSON chunk missing")

    document = json.loads(chunks[0][1])
    material_index = None
    for mesh in document.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            if "COLOR_0" not in primitive.get("attributes", {}) or "material" in primitive:
                continue
            if material_index is None:
                materials = document.setdefault("materials", [])
                material_index = len(materials)
                materials.append({
                    "name": "Vertex Colors",
                    "pbrMetallicRoughness": {
                        "baseColorFactor": [1.0, 1.0, 1.0, 1.0],
                        "metallicFactor": 0.0,
                        "roughnessFactor": 0.8,
                    },
                    "doubleSided": True,
                })
            primitive["material"] = material_index

    if material_index is None:
        return glb

    json_chunk = json.dumps(document, separators=(",", ":")).encode("utf-8")
    json_chunk += b" " * (-len(json_chunk) % 4)
    chunks[0] = (0x4E4F534A, json_chunk)

    output = bytearray(struct.pack("<4sII", b"glTF", 2, 0))
    for kind, data in chunks:
        output.extend(struct.pack("<II", len(data), kind))
        output.extend(data)
    struct.pack_into("<I", output, 8, len(output))
    return bytes(output)


def validate_and_export(input_path, output_path):
    scene = trimesh.load(input_path, force="scene")

    if not scene.geometry:
        raise ValueError("Empty 3D model")

    for mesh in scene.geometry.values():
        if len(mesh.vertices) == 0 or len(mesh.faces) == 0:
            raise ValueError("Invalid mesh")
        if mesh.is_watertight and mesh.volume < 0:
            mesh.invert()

    if scene.bounds is None or not np.isfinite(scene.bounds).all():
        raise ValueError("Invalid mesh bounds")
    if not np.all(scene.extents > 0):
        raise ValueError("Invalid 3D dimensions")

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    scene.export(str(output_path))
    output_path.write_bytes(_add_vertex_color_material(output_path.read_bytes()))
    return str(output_path)
