from pathlib import Path

SOURCE = Path("/content/TripoSR/tsr/models/isosurface.py")
ORIGINAL = "from torchmcubes import marching_cubes"
REPLACEMENT = '''from skimage.measure import marching_cubes as _skimage_mc


def marching_cubes(volume, level):
    verts, faces, _, _ = _skimage_mc(
        volume.detach().float().cpu().numpy(),
        level=level,
    )
    verts = np.ascontiguousarray(verts[:, ::-1])
    faces = np.ascontiguousarray(faces.astype(np.int64))
    return torch.from_numpy(verts), torch.from_numpy(faces)
'''


def main():
    source = SOURCE.read_text()
    if ORIGINAL in source:
        SOURCE.write_text(source.replace(ORIGINAL, REPLACEMENT, 1))
        print("Applied scikit-image marching-cubes fallback")
    elif "from skimage.measure import marching_cubes as _skimage_mc" in source:
        print("TripoSR fallback already applied")
    else:
        raise RuntimeError("TripoSR isosurface.py changed; inspect before patching")


if __name__ == "__main__":
    main()
