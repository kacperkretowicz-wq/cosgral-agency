#!/usr/bin/env python3
"""Check byte ranges and gzip without relying on a separate running server."""
import gzip
import importlib.util
import tempfile
import threading
import unittest
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

spec=importlib.util.spec_from_file_location('serve_agency',Path(__file__).with_name('serve-agency.py'))
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class PreviewServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory()
        cls.root=Path(cls.temp.name)
        cls.video=bytes(range(256))*64
        cls.text=b'const asset = "COSGRAL";\n'*200
        (cls.root/'video.mp4').write_bytes(cls.video)
        (cls.root/'asset.js').write_bytes(cls.text)
        cls.server=ThreadingHTTPServer(('127.0.0.1',0),partial(module.Handler,directory=cls.temp.name))
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True)
        cls.thread.start()
        cls.url=f'http://127.0.0.1:{cls.server.server_port}'
    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown();cls.server.server_close();cls.thread.join();cls.temp.cleanup()
    def request(self,path,headers=None,method='GET'):
        return urlopen(Request(self.url+path,headers=headers or {},method=method))
    def test_range(self):
        with self.request('/video.mp4',{'Range':'bytes=100-1123'}) as r:
            self.assertEqual(r.status,206)
            self.assertEqual(r.headers['Content-Range'],'bytes 100-1123/16384')
            self.assertEqual(r.read(),self.video[100:1124])
    def test_suffix(self):
        with self.request('/video.mp4',{'Range':'bytes=-200'}) as r:self.assertEqual(r.read(),self.video[-200:])
    def test_unsatisfiable(self):
        with self.assertRaises(HTTPError) as failure:self.request('/video.mp4',{'Range':'bytes=999999-'})
        self.assertEqual(failure.exception.code,416)
    def test_head_range(self):
        with self.request('/video.mp4',{'Range':'bytes=0-1023'},'HEAD') as r:
            self.assertEqual(r.status,206);self.assertEqual(r.headers['Content-Length'],'1024');self.assertEqual(r.read(),b'')
    def test_gzip_preserves_text(self):
        with self.request('/asset.js',{'Accept-Encoding':'gzip'}) as r:
            self.assertEqual(r.headers['Content-Encoding'],'gzip')
            data=r.read();self.assertEqual(gzip.decompress(data),self.text);self.assertLess(len(data),len(self.text))
    def test_gzip_cache_validation(self):
        with self.request('/asset.js',{'Accept-Encoding':'gzip'}) as response:
            etag=response.headers['ETag']
        with self.assertRaises(HTTPError) as cached:
            self.request('/asset.js',{'Accept-Encoding':'gzip','If-None-Match':etag})
        self.assertEqual(cached.exception.code,304)
    def test_gzip_disabled(self):
        with self.request('/asset.js',{'Accept-Encoding':'gzip;q=0'}) as r:
            self.assertIsNone(r.headers.get('Content-Encoding'));self.assertEqual(r.read(),self.text)

if __name__=='__main__':unittest.main()
