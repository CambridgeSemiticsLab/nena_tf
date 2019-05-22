import re
import unicodedata

import lxml.html


class Text:
    """Text with style annotations."""
    
    def __init__(self, p_type=None, default_style='italic'):
        self._text = []
        self._p_type = p_type
        self._default_style = default_style
    
    def __getitem__(self, index):
        return self._text[index]
    
    def __iter__(self):
        return iter(self._text)
    
    def __bool__(self):
        return bool(self._text)
    
    def __len__(self):
        return len(self._text)
    
    def __str__(self):
        return ''.join(s for s, t in self._text)
    
    def __repr__(self):
        return f'<{self.__class__.__name__} {repr(self._p_type)} {repr(self.__str__())}>'
    
    def append(self, text, text_style=None):
        """Append tuples of (text, text_style) to list.
        
        Concatenates consecutive strings with the same
        text_style.
        """
        if text_style is None:
            text_style = self._default_style
            
        if self._text and self._text[-1][1] == text_style:
            text = self._text[-1][0] + text
            self._text[-1] = (text, text_style)
        else:
            self._text.append((text, text_style))


#
def get_child_text(e, tags=None):
    """Yield text from child nodes recursively."""
    
    style = get_style(e)
    
    if e.text:
        yield (e.text, style)
        
    for c in e.getchildren():
        # recursive call
        for text, text_style in get_child_text(c, tags):
            yield (text, text_style)
        
        # The puzzling part here (for me) was the
        # 'tail', being text inside an element
        # following a child element, e.g.:
        # <b>bold <i>bold italic</i> bold</b>
        # the ' bold' following the </i> tag.
        # Thanks go to:
        # https://stackoverflow.com/a/41359368/9230612
        if c.tail:
            yield (c.tail, style)

def get_style(e):
    """Return style of inner html elements."""
    
    # Footnote anchors in the text are in <a> tags with attributes:
    # class="sdfootnoteanc" name="sdfootnote{n}anc" href="#sdfootnote{n}sym"
    # Footnote symbols before the actual footnote are in <a> tags with:
    # class="sdfootnoteanc" name="sdfootnote{n}sym" href="#sdfootnote{n}anc"
    # Actual footnotes are wrapped in <div> with "id=sdfootnote{n}"
    def fn_class(e, a_class):
        return ([a.attrib['name'][:-3]
                 for a in e.xpath('ancestor::a')
                 if a.attrib.get('class', '') == a_class]+[''])[0]
    
    def has_tag(e, tag):
        return e.tag == tag or bool(e.xpath(f'ancestor::{tag}'))

    if fn_class(e, 'sdfootnoteanc'):
        style = 'fn_anchor'
    elif fn_class(e, 'sdfootnotesym'):
        style = 'fn_symbol'
    elif has_tag(e, 'sup'):
        style = 'super'
    elif has_tag(e, 'i'):
        style = 'italic'
    else:
        style = ''
    
    return style

def get_paragraph_type(e):
    """Return paragraph type for outer elements <h> <p> and <div>."""
    
    if e.tag == 'p':
        p_type = 'p'
    elif e.tag in ('h1', 'h2'):
        p_type = e.attrib.get('class', '')
    elif e.tag == 'div':
        p_type = e.attrib.get('id', '') or e.attrib.get('title', '')
    else:
        p_type = ''
    
    return p_type

def find_markers(paragraph, markers=None):
    """Find verse numbers and word markers.
    
    Args:
        paragraph: a Text object with a paragraph of text.
        p_markers: a compiled regular expression pattern matching markers.
        p_verse_no: a compiled regular expression pattern matching verse numbers.
    
    Returns:
        A Text object with the updated paragraph.
    """
    
    # regex pattern for verse numbers
    p_verse_no = re.compile('(\s*\([0-9]+\)\s*)')

    # regex pattern for word markers
    if markers is not None:
        p_markers = re.compile('({})'.format('|'.join(re.escape(m) for m in markers)))

    new_p = Text(p_type=paragraph._p_type, default_style=paragraph._default_style)
    
    for text, text_style in paragraph:
        
        # Split superscript text into markers;
        # make text_style of marker the same as marker itself
        # so ('R| +', 'super') may become:
        # [('R', 'R'), ('|', '|'), (' ', 'italic'), ('+', '+')]
        if text_style == 'super' and markers is not None:
            for i, t in enumerate(p_markers.split(text)):
                if t and i % 2:
                    new_p.append(t, t)
                elif t:
                    new_p.append(t)

        # Split verse numbers from verse and give text_style 'verse_no'
        # TODO In one case, this fails (bar text a50-A52.html):
        # '(<i>10)</i>'
        else:
            for i, t in enumerate(p_verse_no.split(text)):
                if t and i % 2:
                    new_p.append(t, 'verse_no')
                elif t:
                    new_p.append(t, text_style)
    
    return new_p

def clean_text(paragraph, replace=None, ignore=None):
    """Normalize unicode and replace or ignore certain characters."""
    
    p_whitespace = re.compile(r'\s+')
    
    new_p = Text(p_type=paragraph._p_type, default_style=paragraph._default_style)
    
    for text, text_style in paragraph:
        
        text = unicodedata.normalize('NFD', text)
        
        text = p_whitespace.sub(' ', text)

        if replace is not None:
            for c in replace:
                text = text.replace(c, replace[c])

        if ignore is not None:
            for c in ignore:
                text = text.replace(c, '')

        new_p.append(text, text_style)
        
    return new_p

def html_to_text(html_file, markers=None, replace=None, skip_front_matter=True):
    """Yield Text objects generated from the HTML in html_file"""
    
    with open(html_file) as f:
        html = f.read()
    tree = lxml.html.fromstring(html)
    
    def is_sectionheading(e):
        """Return true if e is a non-empty sectionheading."""
        return (e.tag == 'h2'
                and e.text.strip()
                and e.attrib.get('class', '') == 'gp-sectionheading-western')

    start = False
    for e in tree.xpath('/html/body/*'):
        
        # skip all elements before the first non-empty sectionheading
        # (relevant especially for Urmi texts, this skips front matter)
        if start is False and skip_front_matter:
            if is_sectionheading(e):
                start = True
            else:
                continue

        p_type = get_paragraph_type(e)
        p = Text(p_type=p_type, default_style='italic')

        for text, text_style in get_child_text(e):
            p.append(text, text_style)
            
        p = clean_text(p, replace=replace)
        # set proper text_style for verse numbers and word markers
        p = find_markers(p, markers=markers)
        
        yield p
