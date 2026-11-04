"""Dependency-free checks for generated multi-page HTML and its local links."""
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = ('index', 'about', 'programs', 'sunday-school', 'visit', 'donate')


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.links = []
        self.active = []
        self.images = []
        self.navs = []
        self.filters = set()
        self.categories = set()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id'):
            self.ids.add(attrs['id'])
        if tag == 'a':
            href = attrs.get('href', '')
            self.links.append(href)
            if attrs.get('aria-current') == 'page':
                self.active.append(href)
        if tag == 'img':
            self.images.append(attrs.get('src', ''))
        if tag == 'nav':
            self.navs.append(attrs.get('aria-label'))
        if 'data-filter' in attrs:
            self.filters.add(attrs['data-filter'])
        if 'data-category' in attrs:
            self.categories.add(attrs['data-category'])


for name in PAGES:
    path = ROOT / f'{name}.html'
    text = path.read_text(encoding='utf-8')
    page = Page()
    page.feed(text)
    assert 'main' in page.ids and 'liquid-nav-root' in page.ids, name
    assert 'hero-hills-root' in page.ids and '/src/hills-entry.tsx' in text, name
    assert page.navs.count('Main navigation') == 1 and page.navs.count('Mobile navigation') == 1, name
    assert page.active == [f'{name}.html', f'{name}.html'], (name, page.active)
    assert 'New River' not in text, name
    for href in page.links:
        if href.startswith('#'):
            assert href[1:] in page.ids, (name, href)
        elif href.endswith('.html'):
            assert (ROOT / href).is_file(), (name, href)
    for image in page.images:
        assert (ROOT / image).is_file(), (name, image)
    if name == 'programs':
        assert page.filters == {'all', 'faith', 'learning', 'community'}
        assert page.categories == page.filters - {'all'}
    if name == 'visit':
        assert {'contact-form', 'form-status', 'copy-status'} <= page.ids
    print(f'{name}.html: OK')
