"""Fail closed when Xcode archives missing, preview or remotely hosted app assets."""
import json
from pathlib import Path
import sys


def verify(app_dir):
    app_dir = Path(app_dir)
    public = app_dir / 'public'
    try:
        marker = json.loads((public / 'mobile-build.json').read_text())
        config = json.loads((app_dir / 'capacitor.config.json').read_text())
    except (OSError, ValueError) as error:
        raise ValueError('Run npm run mobile:sync -- --platform ios with production configuration first.') from error
    if marker.get('preview') is not False or marker.get('configured') is not True:
        raise ValueError('Preview/unconfigured builds cannot be released.')
    if config.get('appId') != 'uk.histreets.app' or config.get('server', {}).get('url'):
        raise ValueError('Release builds must bundle HiStreets locally, without a development server URL.')
    if config.get('server', {}).get('cleartext') is not False:
        raise ValueError('Cleartext connections must be disabled.')
    if config.get('ios', {}).get('webContentsDebuggingEnabled'):
        raise ValueError('Release WebView debugging must be disabled.')
    if not (public / 'index.html').is_file() or not any((public / 'assets').glob('*.js')):
        raise ValueError('The bundled application is incomplete. Rebuild and sync iOS.')


if __name__ == '__main__':
    try:
        verify(sys.argv[1] if len(sys.argv) > 1 else 'ios/App/App')
    except ValueError as error:
        sys.exit(f'error: {error}')
    print('iOS release assets verified (production configuration, local bundle).')
