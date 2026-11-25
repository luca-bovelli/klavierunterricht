# -*- coding: utf-8 -*-
"""Makes the review page's data: review/img/*.webp and review/designs.js from the list below.
python tools/publish.py   (then commit and push)"""
import json, os
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ST, OUT = os.path.join(ROOT, 'stills'), os.path.join(ROOT, 'review', 'img')
os.makedirs(OUT, exist_ok=True)
D24 = '24 November'

def opt(id, title, by, rows, idea='', date='', version='', live=''):
    return dict(id=id, title=title, by=by, rows=rows, idea=idea, date=date, version=version, live=live)

ROUNDS = [
    dict(id='round5', short='Live pages', title='Round 5: real pages', note='Built as working pages by Astra, Neon and Claude at the same time. They appear here as they are finished.', options=json.load(open(os.path.join(ROOT, 'review', 'round5.json'), encoding='utf-8')) if os.path.exists(os.path.join(ROOT, 'review', 'round5.json')) else []),
    dict(id='round4', short='Four offers', title='Round 4: four offers', note='Drawn by Claude, worked out with Neon.', options=[
        opt('stueck-r4', 'Name a piece', 'Claude and Neon', [['pages/stueck-D', 'pages/stueck-P']], 'You name a piece, Luca brings a version you can play in the free trial.', D24),
        opt('teil-r4', 'My part, your part', 'Claude and Neon', [['pages/teil-D', 'pages/teil-P'], ['pages/teil2-D']], 'You play together from the first lesson, and your share grows.', D24),
        opt('leicht-r4', 'Easy and hard', 'Claude and Neon', [['pages/leicht-D', 'pages/leicht-P']], 'One piece, a simple and a full version.', D24),
        opt('zuhause-r4', 'Lesson and home', 'Claude and Neon', [['pages/zuhause-D', 'pages/zuhause-P']], 'A lesson a week, and Fallboard in between.', D24),
        opt('woche-r4', 'The week', 'Claude and Neon', [['pages/woche-D', 'pages/woche-P']], 'Seven days with one piece. Dropped: it felt like homework.', D24),
        opt('unten-r4', 'Lower half of the page', 'Claude and Neon', [['pages/unten-L']], 'What comes out of it, who teaches, prices, booking.', D24),
    ]),
    dict(id='round3', short='Heroes', title='Round 3: hero screens', note='Drawn by Claude.', options=[
        opt('split-r3', 'Split screen', 'Claude', [['market/split-1', 'market/split-P']], 'Easy and hard side by side, full bleed.', D24),
        opt('opta-r3', 'Easy / hard', 'Claude', [['market/optA-1', 'market/optA-P']], '', D24),
        opt('optb-r3', 'Original / your version', 'Claude', [['market/optB-1', 'market/optB-P']], '', D24),
        opt('optc-r3', 'Songs / classical', 'Claude', [['market/optC-1', 'market/optC-P']], '', D24),
        opt('optf-r3', 'Lesson / at home', 'Claude', [['market/optF-1', 'market/optF-P']], '', D24),
        opt('ask-r3', 'Same tune, sad', 'Claude', [['market/ask-1', 'market/ask-P'], ['market/ask-2']], '', D24),
        opt('goal-r3', 'From Despacito to Rachmaninoff', 'Claude', [['market/goal-1', 'market/goal-P'], ['market/goal-2']], '', D24),
        opt('piece-r3', 'A song that grows with you', 'Claude', [['market/piece-1', 'market/piece-P'], ['market/piece-2']], '', D24),
        opt('place-r3', 'Four places', 'Claude', [['market/place-1', 'market/place-P'], ['market/place-2']], '', D24),
        opt('time-r3', 'The first lesson', 'Claude', [['market/time-1', 'market/time-P'], ['market/time-2']], '', D24),
    ]),
    dict(id='round2', short='Framings', title='Round 2: framings', note='Drawn by Claude. Rejected as too much of a tool.', options=[
        opt('ask-r2', 'Ask me', 'Claude', [['frames/ask-D', 'frames/ask-1'], ['frames/ask-2', 'frames/ask-3']], '', D24),
        opt('goal-r2', 'Your way to a piece', 'Claude', [['frames/goal-D', 'frames/goal-1'], ['frames/goal-2', 'frames/goal-3']], '', D24),
        opt('piece-r2', 'One song, five versions', 'Claude', [['frames/piece-D', 'frames/piece-1'], ['frames/piece-2', 'frames/piece-3']], '', D24),
        opt('place-r2', 'Four places', 'Claude', [['frames/place-D', 'frames/place-1'], ['frames/place-2', 'frames/place-3']], '', D24),
        opt('time-r2', 'The first lesson', 'Claude', [['frames/time-D', 'frames/time-1'], ['frames/time-2', 'frames/time-3']], '', D24),
    ]),
    dict(id='round1', short='First ideas', title='Round 1: first ideas', note='Drawn by Claude.', options=[
        opt('hero-orchid-r1', 'From Despacito to Beethoven, violet', 'Claude', [['v1/hero-orchid', 'v1/hero-mobile']], '', D24),
        opt('hero-lagoon-r1', 'From Interstellar to Beethoven, blue', 'Claude', [['v1/hero-lagoon']], '', D24),
        opt('name-r1', 'What does your name sound like', 'Claude', [['v1/name-4', 'v1/name-mobile'], ['v1/name-1', 'v1/name-4-orchid']], '', D24),
    ]),
]

def image(name):
    src = name if os.path.isabs(name) else os.path.join(ST, name + '.png')
    out = name.replace('/', '-').replace('\\', '-') + '.webp'
    im = Image.open(src)
    kind = name.rsplit('-', 1)[-1]
    phone = im.width / im.height < 0.8 and kind not in ('F', 'L', 'D', 'DL', 'D2', 'D3', 'W', 'T')
    css = (390, round(390 * im.height / im.width)) if phone else (1440, round(1440 * im.height / im.width))
    dst = os.path.join(OUT, out)
    if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
        w = min(im.width, 780 if css[0] == 390 else 1800)
        im.convert('RGB').resize((w, round(im.height * w / im.width)), Image.LANCZOS).save(dst, 'WEBP', quality=86, method=6)
    return dict(src=out, w=css[0], h=css[1])

def thumb(name):
    """the card's photo: the top of the first picture, 16:10"""
    src = os.path.join(ST, name + '.png'); out = 't-' + name.replace('/', '-') + '.webp'; dst = os.path.join(OUT, out)
    if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
        im = Image.open(src).convert('RGB'); im = im.crop((0, 0, im.width, min(im.height, round(im.width * 10 / 16))))
        im.resize((760, round(760 * im.height / im.width)), Image.LANCZOS).save(dst, 'WEBP', quality=84, method=6)
    return out

for r in ROUNDS:
    for o in r['options']:
        o['thumb'] = thumb(o['rows'][0][0])
        o['rows'] = [[image(n) for n in row] for row in o['rows']]
with open(os.path.join(ROOT, 'review', 'designs.js'), 'w', encoding='utf-8') as f:
    f.write('/* made by tools/publish.py */\nwindow.DESIGNS = ' + json.dumps(ROUNDS, ensure_ascii=False, indent=1) + ';\n')
print(sum(len(r['options']) for r in ROUNDS), 'options')
