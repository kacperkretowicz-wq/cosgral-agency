#!/usr/bin/env python3
"""Optional compatibility encodes; originals stay untouched. Requires ffmpeg."""
import argparse
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--force',action='store_true',help='Regenerate existing compatibility files')
    args=parser.parse_args()
    root=Path(__file__).resolve().parents[1]/'designkopia/cosgral-agency/portfolio-media'
    files={'web':'showcase/home/web-vertical.mp4','graphics':'showcase/home/graphics-wide.mp4',
           'systems':'showcase/home/systems-vertical.mp4','video':'reels/orlincy/motion-with-intention.mp4'}
    output=root/'previews';output.mkdir(exist_ok=True)
    def encode(item):
        name,relative=item;source=root/relative;destination=output/(name+'.webm')
        if destination.exists() and not args.force:
            print('Retained',destination.name,flush=True);return
        subprocess.run(['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y' if args.force else '-n',
                        '-i',str(source),'-an','-c:v','libvpx-vp9','-crf','32','-b:v','0','-row-mt','1',
                        '-cpu-used','5','-threads','2','-pix_fmt','yuv420p',str(destination)],check=True)
        print('Encoded',destination.name,flush=True)
    with ThreadPoolExecutor(max_workers=2) as executor:list(executor.map(encode,files.items()))


if __name__=='__main__':main()
