# The data herein are the old tables used for transcriptions
# they are placed here for the time being.

# Two tables are presented below
# they are largely identical, but edits
# are made as necessary on a char by char basis.
# The tables are used by the function `trans` to 
# convert the full text

trans_full = {
    # non-latin vowels
    '\u0131': '1',  # 0x0131 ı dotless i
    '\u0251': '@',  # 0x0251 ɑ alpha
    '\u0259': '3',  # 0x0259 ə schwa
    '\u025B': '$',  # 0x025B ɛ open e
    # vowel accents
    '\u0300': '`',  # 0x0300 à grave
    '\u0301': "'",  # 0x0301 á acute
    '\u0304': '_',  # 0x0304 ā macron
    '\u0306': '%',  # 0x0306 ă breve
    '\u0308': '"',  # 0x0308 ä diaeresis
    '\u0303': '~',  # 0x0303 ã tilde
    '\u02C8': '', # 0x2c8 ˈ small vertical line
    # non-latin consonants
    '\u00F0': '6',  # 0x00F0 ð eth
    '\u025F': '&',  # 0x025F ɟ small dotless j with stroke
    '\u0248': '!',  # 0x0248 Ɉ capital J with stroke
    '\u03B8': '8',  # 0x03B8 θ greek theta
    '\u02B8': '7',  # 0x02B8 ʸ small superscript y
    '\u02BE': '}',  # 0x02BE ʾ right half ring (alaph)
    '\u02BF': '{',  # 0x02BF ʿ left half ring (ayin)
    # consonant diacritics
    '\u207A': '+',  # 0x207A ⁺ superscript plus
    '\u030C': '<',  # 0x030C x̌ caron
    '\u0302': '^',  # 0x0302 x̂ circumflex
    '\u0307': ';',  # 0x0307 ẋ dot above
    '\u0323': '.',  # 0x0323 x̣ dot below
    '\u032D': '>',  # 0x032D x̭ circumflex below
    
    # punctuation
    '\u02C8': '|', # 0x2c8 ˈ small vertical line
}

trans_lite = {
    # non-latin vowels
    '\u0131': '1',  # 0x0131 ı dotless i
    '\u0251': 'a',  # 0x0251 ɑ alpha
    '\u0259': '3',  # 0x0259 ə schwa
    '\u025B': 'e',  # 0x025B ɛ open e
    # vowel accents
    '\u0300': '',  # 0x0300 à grave
    '\u0301': '',  # 0x0301 á acute
    '\u0304': '',  # 0x0304 ā macron
    '\u0306': '',  # 0x0306 ă breve
    '\u0308': '',  # 0x0308 ä diaeresis
    '\u0303': '',  # 0x0303 ã tilde
    '\u02C8': '', # 0x2c8 ˈ small vertical line
    # non-latin consonants
    '\u00F0': '6',  # 0x00F0 ð eth
    '\u025F': '&',  # 0x025F ɟ small dotless j with stroke
    '\u0248': '!',  # 0x0248 Ɉ capital J with stroke
    '\u03B8': '8',  # 0x03B8 θ greek theta
    '\u02B8': '7',  # 0x02B8 ʸ small superscript y
    '\u02BE': ')',  # 0x02BE ʾ right half ring (alaph)
    '\u02BF': '(',  # 0x02BF ʿ left half ring (ayin)
    # consonant diacritics
    '\u207A': '',  # 0x207A ⁺ superscript plus
    '\u030C': '',  # 0x030C x̌ caron
    '\u0302': '',  # 0x0302 x̂ circumflex
    '\u0307': '',  # 0x0307 ẋ dot above
    '\u0323': '',  # 0x0323 x̣ dot below
    '\u032D': '',  # 0x032D x̭ circumflex below
    # others
    '\u02c8': '',  # 0x02c8 ˈ vertical line
}

def trans(s, table, mark_punct=True):
    '''
    Transcribes a text.
    '''
    s = unicodedata.normalize('NFD', s)
    # mark punctuation 
    if mark_punct:
        s = re.sub('([\n,.!?:;/])', r'/\g<1>', s, 1)
    return ''.join([table.get(c, c) for c in s])