# -*- coding: utf-8 -*-
"""Puts a finished iteration on the review page: a frozen copy of the page and its pictures.
python tools/post.py <json file>   { "id", "title", "by", "version", "idea", "page": "site/teil", "rows": [["site/teil-D", "site/teil-P"], …], "round": "round5" }
then: python tools/publish.py, commit, push"""
import datetime, json, os, shutil, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
o = json.load(open(sys.argv[1], encoding='utf-8-sig'))
pid = o['id']
if o.get('page'):
    dst = os.path.join(ROOT, 'v', pid)
    if os.path.exists(dst): shutil.rmtree(dst)
    shutil.copytree(os.path.join(ROOT, o['page']), dst, ignore=shutil.ignore_patterns('spec*.json', '*.md', '*.tmp*', 'node_modules', '*.py'))
# pictures are frozen too: the next iteration overwrites stills/site
frozen = os.path.join(ROOT, 'stills', 'posted'); os.makedirs(frozen, exist_ok=True)
rows = []
for row in o['rows']:
    out = []
    for n in row:
        f = pid + '-' + os.path.basename(n).split('-')[-1]
        shutil.copy2(os.path.join(ROOT, 'stills', n + '.png'), os.path.join(frozen, f + '.png')); out.append('posted/' + f)
    rows.append(out)
d = datetime.date.today()
item = dict(id=pid, title=o['title'], by=o['by'], rows=rows, idea=o.get('idea', ''), date=f'{d.day} {d:%B}', version=o.get('version', ''), live=f'v/{pid}/' if o.get('page') else '')
f = os.path.join(ROOT, 'review', (o.get('round') or 'round5') + '.json')
items = json.load(open(f, encoding='utf-8')) if os.path.exists(f) else []
items = [item] + [x for x in items if x['id'] != pid]
json.dump(items, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(pid, 'posted,', len(items), 'in the round')
