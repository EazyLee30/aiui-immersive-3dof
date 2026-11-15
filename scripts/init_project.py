#!/usr/bin/env python3
"""Copy the reference agent into a new empty directory; never overwrite work."""
import argparse
import json
from pathlib import Path
import shutil
import tempfile

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('destination', type=Path)
    parser.add_argument('--name', default='Spatial Scene')
    parser.add_argument('--font-locale', choices=['zh-CN', 'zh-TW'], default='zh-CN', help='Choose pixel-font regional glyph forms; UI copy remains an editable reference.')
    args = parser.parse_args()
    dest = args.destination.expanduser().resolve()
    if not args.name.strip():
        parser.error('--name must not be empty')
    if dest.exists():
        parser.error('Destination already exists; choose a new project directory.')
    source = Path(__file__).resolve().parents[1] / 'assets' / 'starter'
    dest.parent.mkdir(parents=True, exist_ok=True)
    temp = Path(tempfile.mkdtemp(prefix='.spatial-init-', dir=dest.parent))
    try:
        shutil.copytree(source, temp, dirs_exist_ok=True)
        if args.font_locale == 'zh-TW':
            shutil.copyfile(source.parent/'fonts'/'FusionPixel12Traditional.otf', temp/'assets/fonts/FusionPixel12.otf')
        app = json.loads((temp/'app.json').read_text())
        app['window']['navigationBarTitleText'] = args.name
        (temp/'app.json').write_text(json.dumps(app, ensure_ascii=False, indent=2)+'\n')
        agent = json.loads((temp/'agent.json').read_text())
        agent['agentName'] = args.name
        (temp/'agent.json').write_text(json.dumps(agent, ensure_ascii=False, indent=2)+'\n')
        page = temp/'pages/index/index.ink'
        content = page.read_text()
        content = content.replace('"navigationBarTitleText":"Spatial Scene"', '"navigationBarTitleText":'+json.dumps(args.name,ensure_ascii=False))
        page.write_text(content)
        temp.rename(dest)
    finally:
        if temp.exists():
            shutil.rmtree(temp)
    print(json.dumps({'project':str(dest),'name':args.name,'profile':'480x352 monochrome reference','fontLocale':args.font_locale,'next':'Run the installed official AIX check, then adapt and verify on the target.'},ensure_ascii=False,indent=2))

if __name__ == '__main__':
    main()
