#!/usr/bin/env python3
"""Produce a deterministic inventory, excluding build/cache/identity folders."""
import argparse
import hashlib
import json
from pathlib import Path

EXCLUDED = {'.git', '.aix', 'node_modules', '__pycache__', '.DS_Store'}

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('source', type=Path)
    p.add_argument('--output', required=True, type=Path)
    args = p.parse_args()
    source, output = args.source.resolve(), args.output.resolve()
    if not source.is_dir():
        p.error('source must be a directory')
    files = []
    for item in sorted(source.rglob('*')):
        relative = item.relative_to(source)
        if any(part in EXCLUDED or part.startswith('.') for part in relative.parts):
            continue
        if item.is_symlink():
            p.error('Refusing symlink in package inventory: '+str(relative))
        if not item.is_file() or item.resolve() == output:
            continue
        data = item.read_bytes()
        files.append({'path':relative.as_posix(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
    result = {'schemaVersion':1,'files':files,'count':len(files),'bytes':sum(f['bytes'] for f in files)}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps({'output':str(output),'count':result['count'],'bytes':result['bytes']}))

if __name__ == '__main__':
    main()
