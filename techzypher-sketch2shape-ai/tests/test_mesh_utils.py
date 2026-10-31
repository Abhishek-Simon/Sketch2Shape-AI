import json
import struct

import numpy as np
import trimesh

from ml.mesh_utils import validate_and_export


def test_colored_glb_preserves_vertex_colors_and_adds_material(tmp_path):
    mesh = trimesh.creation.box()
    mesh.visual.vertex_colors = np.tile(
        np.array([[245, 110, 210, 255]], dtype=np.uint8),
        (len(mesh.vertices), 1),
    )
    raw = tmp_path / "raw.glb"
    output = tmp_path / "model.glb"
    mesh.export(raw)
    validate_and_export(raw, output)

    imported = trimesh.load(output, force="scene")
    geometry = next(iter(imported.geometry.values()))
    assert len(geometry.vertices) == len(mesh.vertices)
    assert "color" in geometry.visual.vertex_attributes
    assert np.all(geometry.visual.vertex_attributes["color"][:, :3] == [245, 110, 210])

    binary = output.read_bytes()
    size, kind = struct.unpack_from("<II", binary, 12)
    assert kind == 0x4E4F534A
    document = json.loads(binary[20:20 + size])
    primitive = document["meshes"][0]["primitives"][0]
    assert "COLOR_0" in primitive["attributes"]
    assert "material" in primitive
    material = document["materials"][primitive["material"]]
    assert material["pbrMetallicRoughness"]["baseColorFactor"] == [1.0] * 4


def test_geometry_without_explicit_color_still_exports(tmp_path):
    mesh = trimesh.creation.icosphere(subdivisions=1)
    raw = tmp_path / "raw.glb"
    target = tmp_path / "target.glb"
    mesh.export(raw)
    validate_and_export(raw, target)
    assert target.is_file()
