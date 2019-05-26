import re
import unicodedata

import lxml.html


class Text:
    """Text with style annotations."""
    
    def __init__(self, p_type=None, default_style='italic'):
        self._text = []
        self._p_type = p_type
        self._default_style = default_style
        self.last_style = self._default_style
    
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

        self.last_style = text_style


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

def clean_styles(paragraph, no_style=''):
    """Remove styles from characters not matching `rules`."""

    new_p = Text(p_type=paragraph._p_type, default_style=paragraph._default_style)

    for text, text_style in paragraph:

        # first look for combining characters at beginning of text,
        # which should always be added to the end of the previous
        # text (unless it does not follow a character)
        while text and unicodedata.category(text[0]) == 'Mn':
            new_p.append(text[0], new_p.last_style)
            text = text[1:]

        # ideally, the rules for stripping style from
        # certain text_styles should be passed in an
        # argument `rules`: {text_style: rule, ...}.
        # But need to find straightforward way
        # to formulate rules. TODO
        # Removing text_style 'italic' from non-letter characters
        # (where it is either invisible or has no meaning) makes
        # it easier to find things like verse numbers such as:
        # '(<i>10)</i>' ('bar text a50-A52.html')
        if text_style == 'italic':
            for c in text:
                cat = unicodedata.category(c)
                if cat[0] in ('L', 'M'):  # Letters or (combining) Marks
                    new_p.append(c, text_style)
                else:
                    new_p.append(c, no_style)
        else:
            new_p.append(text, text_style)

    return new_p

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

    # regex pattern for brackets
    p_brackets = re.compile('([[()\]])')

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
        else:
            for i, t in enumerate(p_verse_no.split(text)):
                if t and i % 2:
                    new_p.append(t, 'verse_no')
                # Split brackets in unstyled text; if followed by text,
                # give it style 'comment'
                elif t and text_style == '':
                    for j, s in enumerate(p_brackets.split(t)):
                        if s and j % 2:
                            new_p.append(s, s)
                        elif s:
                            if new_p.last_style in ('(', '[', 'comment'):
                                new_p.append(s, 'comment')
                            else:
                                new_p.append(s, text_style)
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

# nested tuple with regexes for parse_headings()
heading_regexes = (
    ('gp-sectionheading',
     # Barwar: text id and title
     ((('text_id', 'title'),
       re.compile('^\s*([A-Z]\s*[0-9]+)\s+(.*?)\s*$')),
      # Urmi_c: text id
      (('text_id',),
       re.compile('^\s*([A-Z]\s*[0-9]+)\s*')),
     )),
    ('gp-subsectionheading',
     # Barwar: informant and place
     ((('informant', 'place'),
       re.compile('^\s*Informant:\s+(.*)\s+\((.*)\)\s*$')),
      # Urmi_C: title, informant, place
      (('title', 'informant', 'place'),
       re.compile('^\s*(.*?)\s*\(([^,]*),\s+(.*)\)\s*$')),
      # Urmi_c: title only
      (('title',),
       re.compile('^\s*(.*?)\s*$')),
     )),
    ('gp-subsubsectionheading',
     # Urmi-C: version, informant, place
     ((('version', 'informant', 'place'),
       re.compile('^\s*(Version\s+[0-9]+):\s+(.*?)\s+\((.*)\)\s?$')),
     )),
)

def parse_metadata(heading, heading_regexes=heading_regexes):
    """Extract metadata from headings

    Arguments:
        heading (Text): Text object of heading
        heading_regexes: nested tuple with regexes:
            ((str:headingtype, tuple:regexes), ...)
            regexes:
                ((tuple:keys, compiled_regex), ...)
                keys:
                    (str:key, ...)
    Returns:
        list of metadata tuples: [(key, value), ...]
    """

    result = []
    for heading_type, regexes in heading_regexes:
        if heading._p_type.startswith(heading_type):
            for keys, regex in regexes:
                try:
                    matched_groups = regex.match(str(heading)).groups()
                    result = list(zip(keys, matched_groups))
                    break
                except AttributeError:
                    continue
            break
    return result

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
        p = clean_styles(p)
        # set proper text_style for verse numbers and word markers
        p = find_markers(p, markers=markers)
        
        yield p
