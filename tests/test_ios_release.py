"""Exercise the archive guard with real temporary bundles, without Apple tools."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('guard', Path(__file__).parents[1] / 'scripts/verify-ios-release.py')
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)


class IOSReleaseGuard(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.app = Path(self.temp.name)
        (self.app / 'public/assets').mkdir(parents=True)
        (self.app / 'public/index.html').write_text('<html></html>')
        (self.app / 'public/assets/app.js').write_text('console.log("fixture")')
        self.marker = {'configured': True, 'preview': False}
        self.config = {'appId': 'uk.histreets.app', 'server': {'cleartext': False}}

    def verify(self):
        (self.app / 'public/mobile-build.json').write_text(json.dumps(self.marker))
        (self.app / 'capacitor.config.json').write_text(json.dumps(self.config))
        guard.verify(self.app)

    def test_production_bundle(self):
        self.verify()

    def test_preview_and_missing_configuration_rejected(self):
        for marker in ({}, {'configured': False, 'preview': False}, {'configured': True, 'preview': True}, {'configured': 'true', 'preview': False}):
            with self.subTest(marker=marker), self.assertRaisesRegex(ValueError, 'Preview/unconfigured'):
                self.marker = marker
                self.verify()

    def test_missing_marker_rejected(self):
        with self.assertRaisesRegex(ValueError, 'production configuration'):
            guard.verify(self.app)

    def test_remote_debug_server_rejected(self):
        self.config['server']['url'] = 'https://example.com'
        with self.assertRaisesRegex(ValueError, 'development server'):
            self.verify()

    def test_wrong_bundle_identity_rejected(self):
        self.config['appId'] = 'uk.histreets.preview'
        with self.assertRaisesRegex(ValueError, 'bundle HiStreets'):
            self.verify()

    def test_cleartext_rejected(self):
        self.config['server']['cleartext'] = True
        with self.assertRaisesRegex(ValueError, 'Cleartext'):
            self.verify()

    def test_debugging_rejected(self):
        self.config['ios'] = {'webContentsDebuggingEnabled': True}
        with self.assertRaisesRegex(ValueError, 'debugging'):
            self.verify()

    def test_incomplete_assets_rejected(self):
        (self.app / 'public/assets/app.js').unlink()
        with self.assertRaisesRegex(ValueError, 'incomplete'):
            self.verify()


if __name__ == '__main__':
    unittest.main()
