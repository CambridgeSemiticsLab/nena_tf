d = 'about'
featureMeta = {
    'dialect': {d: 'name of a dialect in Northeastern Neo-Aramaic'},
    'title': {d: 'title of a text (story)'},
    'version': {d: 'version of the story if there are multiple instances of the same story'},
    'number': {d: 'sequential number of a paragraph or line within a text or paragraph, respectively'},
    'text': {d: 'plain text representation of a letter, morpheme, or word'},
    'end': {d: 'space, punctuation, or other stylistic text at the end of a morpheme or word'},
    'trans_f': {d: 'full, one-to-one transcription of a letter, morpheme, or word'},
    'trans_l': {d: 'lite transcription of a letter, morpheme, or word, without vowel accents'},
    'etrans_f': {d: 'full transcription of punctuation or other stylistic text at the end of a morpheme or word; see also trans_f'},
    'etrans_l': {d: 'lite transcription of punctuation or other stylistic text at the end of a morpheme or word, excluding intonation boundary markers; see also trans_l'},
    'speaker': {d: 'name or initials of person speaking a morpheme or word; see also informant'},
    'footnotes': {d: 'explanatory footnote on a morpheme or text'},
    'lang': {d: 'language of a morpheme foreign to a text'},
    'foreign': {d: 'indicates whether a morpheme is foreign to a text; see also lang'},
    'comment': {d: 'explanatory comment inserted in the text, stored on a morpheme'},
    'continued_from': {d: 'text is a follow-up to the named text'},
    'informant': {d: 'name of person who spoke these words'},
    'place': {d: 'place a text was recorded'},
    'source': {d: 'name of the file from which a text was converted'},
    'text_id': {d: 'id of a text within its original publication; can overlap between publications'},
}

for feature, descr in featureMeta.items():
    descr = descr['about']
    print(f'{feature}:\n{descr}\n') 
