"""Copy only the Jaffery Center site into a fresh, independent repository directory.

This never changes, removes, or renames anything in the existing checkout.
Run `python3 scripts/export_standalone.py` from the DeadlineOS checkout.
"""
from pathlib import Path
import argparse
import json
import shutil

ROOT = Path(__file__).resolve().parent.parent
FILES = (
    '.gitignore', 'build.py', 'styles.css', 'brand-theme.css', 'site.js',
    'index.html', 'about.html', 'programs.html', 'sunday-school.html',
    'visit.html', 'donate.html', 'components.json', 'package.json',
    'package-lock.json', 'postcss.config.js', 'tailwind.config.js',
    'tsconfig.json', 'vite.config.ts',
)
DIRECTORIES = ('assets', 'components', 'lib', 'src')


def export(destination: Path) -> None:
    destination = destination.resolve()
    if destination == ROOT or destination in ROOT.parents:
        raise ValueError('Destination must not be the current repository or its parent.')
    if destination.exists() and any(destination.iterdir()):
        raise ValueError(f'Destination is not empty: {destination}. Choose a fresh directory; nothing was overwritten.')
    for folder in DIRECTORIES + ('scripts',):
        if destination == ROOT / folder or ROOT / folder in destination.parents:
            raise ValueError('Destination must be outside the source tree folders.')
    destination.mkdir(parents=True, exist_ok=True)
    for filename in FILES:
        shutil.copy2(ROOT / filename, destination / filename)
    for folder in DIRECTORIES:
        shutil.copytree(ROOT / folder, destination / folder, ignore=shutil.ignore_patterns('__pycache__', '.DS_Store'))
    (destination / 'scripts').mkdir()
    shutil.copy2(ROOT / 'scripts/check_pages.py', destination / 'scripts/check_pages.py')
    shutil.copy2(ROOT / 'docs/STANDALONE.md', destination / 'README.md')
    (destination / 'vercel.json').write_text(json.dumps({
        'framework': 'vite',
        'installCommand': 'npm ci',
        'buildCommand': 'npm run build:vercel',
        'outputDirectory': 'dist',
    }, indent=2) + '\n', encoding='utf-8')
    print(f'Prepared independent site at: {destination}')
    print('DeadlineOS files (app.js, fx.js, orbitos-dev, main/index.html) were NOT copied or changed.')
    print('No Git repository, Vercel project, deployment or domain was created.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('destination', nargs='?', type=Path, default=ROOT / 'standalone-export')
    args = parser.parse_args()
    export(args.destination)
