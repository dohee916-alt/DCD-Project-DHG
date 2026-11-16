"""Provision approved DCD website soundtrack in the GitHub repository.
Sources: Tunetank on Pixabay; dheming, unfa and Qvantor on Freesound.
Keep uploaded user masters when available; public previews are the build fallback.
"""
from pathlib import Path
import html
import json
import re
import subprocess
import sys
import requests
from bs4 import BeautifulSoup

OUT=Path("assets/audio")
OUT.mkdir(parents=True,exist_ok=True)
SESSION=requests.Session()
SESSION.headers.update({"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
"Accept-Language":"en-US,en;q=0.9"})

def webpage(url):
    r=SESSION.get(url,timeout=35)
    r.raise_for_status()
    return r.text

def music_url():
    url="https://pixabay.com/music/electronic-fashion-advertising-promo-348345/"
    page=webpage(url)
    doc=BeautifulSoup(page,"html.parser")
    for node in doc.select('script[type="application/ld+json"]'):
        try:
            tree=json.loads(node.text)
            candidates=tree if isinstance(tree,list) else tree.get("@graph",[tree])
            for obj in candidates:
                if isinstance(obj,dict) and obj.get("contentUrl"):
                    target=obj["contentUrl"]
                    if isinstance(target,str) and ".mp3" in target:return html.unescape(target)
        except Exception:pass
    matches=re.findall(r'https?[^"'+"'" +r'<>\s]+?\.mp3(?:\?[^"'+"'" +r'<>\s]+)?',page)
    for match in matches:
        u=html.unescape(match.replace("\\/","/"))
        if "pixabay.com/audio" in u and "cdn" in u:return u
    raise RuntimeError("Pixabay track audio URL missing from page metadata")

def sound_url(username,number):
    page=webpage(f"https://freesound.org/people/{username}/sounds/{number}/")
    doc=BeautifulSoup(page,"html.parser")
    node=doc.select_one('meta[property="og:audio"]') or doc.select_one('meta[name="twitter:player:stream"]')
    found=node.get("content","") if node else ""
    if not ("cdn.freesound.org/previews/" in found and ".mp3" in found):
        match=re.search(r'https?:\\?/\\?/cdn\.freesound\.org\\?/previews\\?/[^"\\\s<>]+?\.mp3',page)
        if match:found=match.group(0).replace("\\/","/")
    if not ("cdn.freesound.org/previews/" in found and ".mp3" in found):
        raise RuntimeError(f"Freesound preview URL missing for {number}")
    found=html.unescape(found)
    # The Freesound page puts a site URL before the absolute preview URL in
    # some metadata fields. Extract the embedded CDN URL explicitly.
    cdn="https://cdn.freesound.org/previews/"
    if cdn in found:
        found=found[found.rfind(cdn):]
    else:
        raise RuntimeError("No absolute CDN URL in Freesound preview")
    return found.split()[0].replace("-lq.mp3","-hq.mp3")

def fetch(url,destination):
    if destination.exists() and destination.stat().st_size>3000:
        print("Existing asset:",destination);return
    r=SESSION.get(url,timeout=120,stream=True)
    r.raise_for_status()
    with destination.open("wb") as f:
        for block in r.iter_content(128*1024):
            if block:f.write(block)
    if destination.stat().st_size<3000:raise RuntimeError(f"Empty or failed download: {url}")
    print("Fetched:",destination,destination.stat().st_size)

def ffmpeg(source,dest,*args):
    if dest.exists() and dest.stat().st_size>1500:return
    subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-y",*args,
      "-i",str(source),"-ar","24000","-ac","1","-c:a","libopus","-b:a","30k",str(dest)],check=True)

# Source files are public previews when this workflow runs remotely. They
# are the same user-approved recordings, not substituted sound designs.
bgm=OUT/"dcd-fashion-advertising-promo.mp3"
try:
    fetch(music_url(),bgm)
except Exception as exc:
    # Pixabay may block GitHub's datacenter IP even for public audio.
    # Continue installing CC previews so the other sound cues still work.
    print("WARNING: Pixabay BGM download unavailable:",repr(exc),flush=True)
sources={
    "creak":("dheming",274977),
    "pills":("unfa",170637),
    "whoosh":("Qvantor",877980),
}
for key,(user,num) in sources.items():
    fetch(sound_url(user,num),OUT/f".dcd-source-{key}.mp3")

ffmpeg(OUT/".dcd-source-creak.mp3",OUT/"dcd-plastic-creak.ogg",
       "-ss","14.5","-t","2.5","-af",
       "highpass=f=160,volume=4.5,alimiter=limit=0.94,afade=t=in:st=0:d=0.08,afade=t=out:st=2.28:d=0.22")
ffmpeg(OUT/".dcd-source-pills.mp3",OUT/"dcd-blister-burst-1p5s.ogg",
       "-ss","9","-t","3.5","-af",
       "atempo=2.333333,volume=3.2,alimiter=limit=0.94,afade=t=out:st=1.4:d=0.1")
ffmpeg(OUT/".dcd-source-whoosh.mp3",OUT/"dcd-pack-whoosh.ogg",
       "-t","3.2","-af","volume=0.8")
for p in OUT.glob(".dcd-source-*"):p.unlink()
for p in (bgm,OUT/"dcd-plastic-creak.ogg",OUT/"dcd-blister-burst-1p5s.ogg",OUT/"dcd-pack-whoosh.ogg"):
    if not p.exists():continue
    print("READY",p,p.stat().st_size)
