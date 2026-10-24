import json

with open('data/seed/destinations.json', encoding='utf-8') as f:
    data = json.load(f)

print(f"Total destinations: {len(data)}")
for i, d in enumerate(data, 1):
    slug = d['slug']
    cat = d['category']
    dist = d['district_code']
    name = slug
    if 'translations' in d and d['translations']:
        for t in d['translations']:
            if t['language_code'] == 'en':
                name = t['name']
                break
    media = d.get('media', [])
    m_url = media[0]['url'] if media else 'NO MEDIA'
    print(f"{i:2d}. {slug:<32} | {dist} | {cat:<18} | {name:<35} | {m_url[:50]}")
