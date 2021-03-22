# NENA Text-Fabric Corpus

The NENA Text-Fabric (TF) corpus contains textual transcriptions and linguistic annotations from the research group under Geoffrey Khan at the University of Cambridge.

## Contents

* [Data Model](#Data-Model)
* [Node Types](#Node-Types)
* [Features](#Features)

## Data Model

For a full description of the Text-Fabric data model, see the [datamodel documentation](https://annotation.github.io/text-fabric/Model/Data-Model/).

One can think about the NENA Text-Fabric resource in two ways. The first is as a **conceptual** model, and the second is as a literal **implementation**. The conceptual model is simply a way of thinking about the text and all its various parts (words, sentences, letters, etc.). The literal implementation is the way that conceptual model is actually stored on a computer. 

The **conceptual** model of the TF NENA corpus is a graph. In mathematics, a [graph](https://en.wikipedia.org/wiki/Graph_theory) is a method of indicating relationships between entities. The entities in a graph are called "nodes", often illustrated visually as circles. Their relationships to one another are called "edges", illustrated with lines drawn between two or more circles. A visual representation can be seen below.

<img src="images/graph_illustration.png" height=30% width=30%>

In the case of a [text graph](https://www.balisage.net/Proceedings/vol19/html/Dekker01/BalisageVol19-Dekker01.html), entities like letters, words, sentences are stored as nodes. These entities also have relationships. A key relationship in Text-Fabric is "containment": a sentence contains a word, a word contains a letter. Other, optional relationships might be syntactic relations or discourse relations between sentences. With the exception of "containment", the graph model of Text-Fabric does not "care" which other relationships are modeled (syntax, discourse, etc.). The user(s) are free to choose whatever relationships they are interested in.

For instance, in the example below we can see a containment relationship being modelled between a given word and its letter:

<img src="images/containment_illustration.png" height=30% width=30%>


*To be continued...*

<hr>

# Node Types

| node type   | description                                                                                                              |   frequency | features                                                                                                                                                                                                                                                                                                                                                                                                                                       |
|:------------|:-------------------------------------------------------------------------------------------------------------------------|------------:|:-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| dialect     | dialect of North Eastern Neo-Aramaic                                                                                     |           2 | [dialect](#dialect)                                                                                                                                                                                                                                                                                                                                                                                                                            |
| text        | transcribed story from a native NENA informant                                                                           |         126 | [place](#place), [dialect](#dialect), [speakers](#speakers), [text_id](#text_id), [title](#title)                                                                                                                                                                                                                                                                                                                                              |
| paragraph   | paragraph segment based on newlines                                                                                      |         350 |                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| line        | verse-like section used for reference; corresponds with publications where applicable                                    |        2544 | [line_number](#line_number)                                                                                                                                                                                                                                                                                                                                                                                                                    |
| sentence    | sentence based on one or more of the following punctuators [.!?]                                                         |       16326 |                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| subsentence | part of sentence based on one of the following punctuators: [;,—:]                                                       |       24497 |                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| inton       | intonation group of words/letters based on ˈ symbol (superscript |), which marks such boundaries                         |       36444 |                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| stress      | stress group of words, marked either by hyphenated segments or standalone words; e.g. 'xa-ga' is 2 words, 1 stress group |       93766 |                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| word        | word in NENA or other language segmented by either whitespace or one of [-=]                                             |      120151 | [lang](#lang), [full](#full), [fuzzy_end](#fuzzy_end), [text_end](#text_end), [fuzzy](#fuzzy), [lemma](#lemma), [lite](#lite), [pos](#pos), [lite_end](#lite_end), [st](#st), [variable](#variable), [gn](#gn), [tense](#tense), [text_nostress](#text_nostress), [full_end](#full_end), [speaker](#speaker), [text](#text), [nu_class](#nu_class), [n_parses](#n_parses), [nu](#nu), [gloss](#gloss), [text_nostress_end](#text_nostress_end) |
| letter      | an individual letter including diacritics recognized by pattern matches against canonical NENA alphabet                  |      539378 | [phonetic_class](#phonetic_class), [lite](#lite), [text](#text), [phonation](#phonation), [phonetic_place](#phonetic_place), [full](#full), [fuzzy](#fuzzy), [phonetic_manner](#phonetic_manner), [text_nostress](#text_nostress)                                                                                                                                                                                                              |

# Features

## dialect

name of a dialect in North Eastern Neo-Aramaic

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| dialect     |           2 |
| text        |         126 |

**Values**
| dialect   |   frequency |
|:----------|------------:|
| Urmi_C    |          75 |
| Barwar    |          53 |

[back to node types](#Node-Types)
<hr>

## title

title of a text (story)

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| text        |         126 |

**Values**
| title                                         | dialect   |
|:----------------------------------------------|:----------|
| A Hundred Gold Coins                          | Barwar    |
| A Man Called Čuxo                             | Barwar    |
| A Tale of Two Kings                           | Barwar    |
| A Tale of a Prince and a Princess             | Barwar    |
| Baby Leliθa                                   | Barwar    |
| Dəmdəma                                       | Barwar    |
| Gozali and Nozali                             | Barwar    |
| I Am Worth the Same as a Blind Wolf           | Barwar    |
| Man Is Treacherous                            | Barwar    |
| Measure for Measure                           | Barwar    |
| Nanno and Jəndo                               | Barwar    |
| Qaṭina Rescues His Nephew From Leliθa         | Barwar    |
| Sour Grapes                                   | Barwar    |
| Tales From the 1001 Nights                    | Barwar    |
| The Battle With Yuwanəs the Armenian          | Barwar    |
| The Bear and the Fox                          | Barwar    |
| The Brother of Giants                         | Barwar    |
| The Cat and the Mice                          | Barwar    |
| The Cooking Pot                               | Barwar    |
| The Crafty Hireling                           | Barwar    |
| The Crow and the Cheese                       | Barwar    |
| The Daughter of the King                      | Barwar    |
| The Fox and the Lion                          | Barwar    |
| The Fox and the Miller                        | Barwar    |
| The Fox and the Stork                         | Barwar    |
| The Giant’s Cave                              | Barwar    |
| The Girl and the Seven Brothers               | Barwar    |
| The King With Forty Sons                      | Barwar    |
| The Leliθa From č̭āl                           | Barwar    |
| The Lion King                                 | Barwar    |
| The Lion With a Swollen Leg                   | Barwar    |
| The Man Who Cried Wolf                        | Barwar    |
| The Man Who Wanted to Work                    | Barwar    |
| The Monk Who Wanted to Know When He Would Die | Barwar    |
| The Monk and the Angel                        | Barwar    |
| The Priest and the Mullah                     | Barwar    |
| The Sale of an Ox                             | Barwar    |
| The Scorpion and the Snake                    | Barwar    |
| The Selfish Neighbour                         | Barwar    |
| The Sisisambər Plant                          | Barwar    |
| The Story With No End                         | Barwar    |
| The Tale of Farxo and Səttiya                 | Barwar    |
| The Tale of Mămo and Zine                     | Barwar    |
| The Tale of Mərza Pămət                       | Barwar    |
| The Tale of Nasimo                            | Barwar    |
| The Tale of Parizada, Warda and Nargis        | Barwar    |
| The Tale of Rustam (1)                        | Barwar    |
| The Tale of Rustam (2)                        | Barwar    |
| The Wise Daughter of the King                 | Barwar    |
| The Wise Snake                                | Barwar    |
| The Wise Young Man                            | Barwar    |
| Šošət Xere                                    | Barwar    |
| A Close Shave                                 | Urmi_C    |
| A Cure for a Husband’s Madness                | Urmi_C    |
| A Donkey Knows Best                           | Urmi_C    |
| A Dragon in the Well                          | Urmi_C    |
| A Dutiful Son                                 | Urmi_C    |
| A Frog Wants a Husband                        | Urmi_C    |
| A Lost Donkey                                 | Urmi_C    |
| A Lost Ring                                   | Urmi_C    |
| A Painting of the King of Iran                | Urmi_C    |
| A Pound of Flesh                              | Urmi_C    |
| A Sweater to Pay Off a Debt                   | Urmi_C    |
| A Thousand Dinars                             | Urmi_C    |
| A Visit From Harun Ar-Rashid                  | Urmi_C    |
| Agriculture and Village Life                  | Urmi_C    |
| Am I Dead?                                    | Urmi_C    |
| An Orphan Duckling                            | Urmi_C    |
| Axiqar                                        | Urmi_C    |
| Events in 1946 on the Urmi Plain              | Urmi_C    |
| Games                                         | Urmi_C    |
| Hunting                                       | Urmi_C    |
| I Have Died                                   | Urmi_C    |
| Ice for Dinner                                | Urmi_C    |
| Is There a Man With No Worries?               | Urmi_C    |
| Kindness to a Donkey                          | Urmi_C    |
| Lost Money                                    | Urmi_C    |
| Mistaken Identity                             | Urmi_C    |
| Much Ado About Nothing                        | Urmi_C    |
| Nipuxta                                       | Urmi_C    |
| No Bread Today                                | Urmi_C    |
| Problems Lighting a Fire                      | Urmi_C    |
| St. Zayya’s Cake Dough                        | Urmi_C    |
| Star-Crossed Lovers                           | Urmi_C    |
| Stomach Trouble                               | Urmi_C    |
| The Adventures of Ashur                       | Urmi_C    |
| The Adventures of Two Brothers                | Urmi_C    |
| The Adventures of a Princess                  | Urmi_C    |
| The Angel of Death                            | Urmi_C    |
| The Assyrians of Armenia                      | Urmi_C    |
| The Assyrians of Urmi                         | Urmi_C    |
| The Bald Child and the Monsters               | Urmi_C    |
| The Bald Man and the King                     | Urmi_C    |
| The Bird and the Fox                          | Urmi_C    |
| The Cat’s Dinner                              | Urmi_C    |
| The Cow and the Poor Girl                     | Urmi_C    |
| The Dead Rise and Return                      | Urmi_C    |
| The Fisherman and the Princess                | Urmi_C    |
| The Giant One-Eyed Demon                      | Urmi_C    |
| The Little Prince and the Snake               | Urmi_C    |
| The Loan of a Cooking Pot                     | Urmi_C    |
| The Man Who Wanted to Complain to God         | Urmi_C    |
| The Old Man and the Fish                      | Urmi_C    |
| The Purchase of a Donkey                      | Urmi_C    |
| The Snake’s Dilemma                           | Urmi_C    |
| The Stupid Carpenter                          | Urmi_C    |
| The Wife Who Learns How to Work               | Urmi_C    |
| The Wife Who Learns How to Work (2)           | Urmi_C    |
| The Wife’s Condition                          | Urmi_C    |
| The Wise Brother                              | Urmi_C    |
| The Wise Young Daughter                       | Urmi_C    |
| Trickster                                     | Urmi_C    |
| Two Birds Fall in Love                        | Urmi_C    |
| Two Wicked Daughters-In-Law                   | Urmi_C    |
| Village Life                                  | Urmi_C    |
| Village Life (2)                              | Urmi_C    |
| Village Life (3)                              | Urmi_C    |
| Village Life (4)                              | Urmi_C    |
| Village Life (5)                              | Urmi_C    |
| Village Life (6)                              | Urmi_C    |
| Vineyards                                     | Urmi_C    |
| Weddings                                      | Urmi_C    |
| Weddings and Festivals                        | Urmi_C    |
| When Shall I Die?                             | Urmi_C    |
| Women Are Stronger Than Men                   | Urmi_C    |
| Women Do Things Best                          | Urmi_C    |

[back to node types](#Node-Types)
<hr>

## place

place a text was recorded

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| text        |         126 |

**Values**
| place                  |   frequency |
|:-----------------------|------------:|
| +Hassar +Baba-čanɟa, N |          36 |
| Dure                   |          31 |
| ʾƐn-Nune               |          20 |
| Zumallan, N            |          11 |
| Canda, Georgia         |           7 |
| Guylasar, Armenia      |           7 |
| Arzni, Armenia         |           4 |
| Babari, S              |           3 |
| +Hassar +Baba-canɟa, N |           1 |
| +Spurġān, N            |           1 |
| Gulpashan, S           |           1 |
| Mushava, N             |           1 |
| Mushawa, N             |           1 |
| Spurġān, N             |           1 |
| Ɛn Nune                |           1 |

[back to node types](#Node-Types)
<hr>

## text_id

id of a text within its original publication; can overlap between publications

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| text        |         125 |

**Examples**
```
A10
A11
A12
A13
A14
```

[back to node types](#Node-Types)
<hr>

## speakers

names of speakers found in a text

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| text        |         126 |

**Examples**
```
Yulia Davudi
Dawið ʾAdam
Yuwəl Yuḥanna
Maryam Gwirgis
Yuwarəš Xošăba Kena
```

[back to node types](#Node-Types)
<hr>

## line_number

sequential number of a line for reference purposes; corresponds with publications where applicable

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| line        |        2544 |

**Examples**
```
1
2
3
4
5
```

[back to node types](#Node-Types)
<hr>

## text

utf8 text representation of a letter or word

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |      120151 |
| letter      |      539378 |


See the [transcription tables](transcription.md).

[back to node types](#Node-Types)
<hr>

## text_nostress

utf8 text without stress markers

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |      120151 |
| letter      |      539378 |


See the [transcription tables](transcription.md).

[back to node types](#Node-Types)
<hr>

## full

full transcription, one-to-one transcription of a letter or word

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |      120151 |
| letter      |      539378 |


See the [transcription tables](transcription.md).

[back to node types](#Node-Types)
<hr>

## lite

lite transcription of a letter or word, without vowel accents

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |      120151 |
| letter      |      539378 |


See the [transcription tables](transcription.md).

[back to node types](#Node-Types)
<hr>

## fuzzy

fuzzy transcription that leaves out most diacritics and maps certain characters in certain dialects to common characters

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |      120151 |
| letter      |      539378 |


See the [transcription tables](transcription.md).

[back to node types](#Node-Types)
<hr>

## text_end

space, punctuation, or other stylistic text at the end a letter or word

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |      120139 |


See the [transcription tables](transcription.md).

[back to node types](#Node-Types)
<hr>

## full_end

full transcription of punctuation or other stylistic text at the end of a letter or word; see also trans_f

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |      120139 |


See the [transcription tables](transcription.md).

[back to node types](#Node-Types)
<hr>

## lite_end

lite transcription of punctuation or other stylistic text at the end of a letter or word, excluding intonation boundary markers; see also trans_l

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |      120139 |


See the [transcription tables](transcription.md).

[back to node types](#Node-Types)
<hr>

## fuzzy_end

fuzzy transcription of punctuation or other stylistic text at the end of a letter or word, excluding intonation boundary markers; see also trans_l

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |      120139 |


See the [transcription tables](transcription.md).

[back to node types](#Node-Types)
<hr>

## text_nostress_end

non-stressed transcription of punctuation or other stylistic text at the end of a letter or word, excluding intonation boundary markers; see also trans_l

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |      120139 |


See the [transcription tables](transcription.md).

[back to node types](#Node-Types)
<hr>

## speaker

name of person speaking a given word

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |      120151 |

**Examples**
```
Dawið ʾAdam
Yulia Davudi
Yuwarəš Xošăba Kena
Manya Givoyev
Yuwəl Yuḥanna
```

[back to node types](#Node-Types)
<hr>

## lang

language of a foreign word

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |      120151 |

**Values**
| lang        |   frequency |
|:------------|------------:|
| NENA        |      117093 |
| K.          |        1767 |
| A.          |         775 |
| K./A.       |         263 |
| A.|A.|K.    |          65 |
| A.|K.       |          35 |
| K./T.       |          32 |
| K.|K.       |          26 |
| K.|K.|K.    |          18 |
| A.|A.       |          16 |
| Urm.        |          16 |
| E.          |          12 |
| K./A./E.    |           9 |
| P.          |           5 |
| A./K.       |           4 |
| K./A.|K./A. |           4 |
| T.          |           4 |
| Ṭiy.        |           3 |
| A./E.       |           2 |
| K./E.       |           1 |
| K./T.|K./T. |           1 |

[back to node types](#Node-Types)
<hr>

## phonetic_class

class of a letter (consonant or vowel)

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| letter      |      539360 |

**Values**
| phonetic_class   |   frequency |
|:-----------------|------------:|
| consonant        |      310962 |
| vowel            |      228398 |

[back to node types](#Node-Types)
<hr>

## phonetic_place

place of articulation of a given letter

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| letter      |      310962 |

**Values**
| phonetic_place   |   frequency |
|:-----------------|------------:|
| dental-alveolar  |      150177 |
| labial           |       62013 |
| velar            |       32035 |
| palatal          |       25837 |
| laryngeal        |       23789 |
| palatal-alveolar |       12557 |
| uvular           |        4181 |
| pharyngeal       |         373 |

[back to node types](#Node-Types)
<hr>

## phonetic_manner

manner of the sound of a letter

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| letter      |      310962 |

**Values**
| phonetic_manner   |   frequency |
|:------------------|------------:|
| affricative       |      108364 |
| nasal             |       52559 |
| other             |       48948 |
| fricative         |       40138 |
| lateral           |       39248 |
| sibilant          |       21705 |

[back to node types](#Node-Types)
<hr>

## phonation

phonation of a letter

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| letter      |      306781 |

**Values**
| phonation            |   frequency |
|:---------------------|------------:|
| plain                |      140049 |
| unvoiced_aspirated   |       56659 |
| voiced               |       50887 |
| unvoiced             |       44043 |
| unvoiced_unaspirated |       10671 |
| emphatic             |        4472 |

[back to node types](#Node-Types)
<hr>

## lemma

parsed lemma form, if available

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |       21716 |

**Examples**
```
w
xa
la|la.2
ʾana
naša
```

[back to node types](#Node-Types)
<hr>

## pos

part of speech of lemma

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |       21716 |

**Values**
| pos                 |   frequency |
|:--------------------|------------:|
| NOUN                |        8010 |
| PART                |        4532 |
| PRON                |        2080 |
| NUMR                |        1871 |
| ADJV                |        1006 |
| ADVB                |         924 |
| NOUN|PART           |         742 |
| NOUN|NOUN           |         439 |
| MODI                |         422 |
| PRON|PART           |         338 |
| PART|PRON           |         318 |
| MODI|NOUN           |         250 |
| MODI|PRON           |         199 |
| PART|NOUN           |         117 |
| NOUN|NOUN|NOUN      |         103 |
| PART|PART|PART      |          65 |
| INTJ                |          59 |
| ADVB|NOUN           |          52 |
| NOUN|ADVB           |          39 |
| NOUN|ADJV           |          30 |
| ADJV|ADJV           |          27 |
| ADJV|NOUN           |          23 |
| NUMR|NUMR           |          21 |
| ADJV|ADVB           |          17 |
| NOUN|NOUN|NOUN|NOUN |          15 |
| PREP                |           8 |
| ADJV|NOUN|NOUN      |           5 |
| NOUN|INTJ           |           2 |
| ADJV|NOUN|NOUN|NOUN |           1 |
| VERB                |           1 |

[back to node types](#Node-Types)
<hr>

## variable

variability of lemma form

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |         125 |

**Values**
| variable   |   frequency |
|:-----------|------------:|
| INVAR      |         125 |

[back to node types](#Node-Types)
<hr>

## st

grammatical state of a word

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |         483 |

**Values**
| st    |   frequency |
|:------|------------:|
| C     |         241 |
| A     |         175 |
| A|A|A |          62 |
| C|C|C |           5 |

[back to node types](#Node-Types)
<hr>

## gn

grammatical gender of a word

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |       14366 |

**Examples**
```
M
F
C
M|M
F|F
```

[back to node types](#Node-Types)
<hr>

## nu

grammatical number of a word

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |        8206 |

**Values**
| nu          |   frequency |
|:------------|------------:|
| PL          |        6018 |
| SG          |        1635 |
| PL|PL       |         438 |
| PL|PL|PL    |          98 |
| PL|PL|PL|PL |          16 |
| SG|SG       |           1 |

[back to node types](#Node-Types)
<hr>

## nu_class

semantic class of a word's grammatical number

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |         132 |

**Values**
| nu_class   |   frequency |
|:-----------|------------:|
| TANT       |         132 |

[back to node types](#Node-Types)
<hr>

## tense

tense of a verb

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |           1 |

**Values**
| tense   |   frequency |
|:--------|------------:|
| IMP     |           1 |

[back to node types](#Node-Types)
<hr>

## gloss

English gloss of a word lemma, if available

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |       21713 |

**Examples**
```
and
one; a (§14.1.)
speaker deixis demonstrative (§7.4., §14.3.2.)
side, direction|no (variants laʾ, laʾa), not; neither/nor; asseverative particle.
I
```

[back to node types](#Node-Types)
<hr>

## n_parses

number of parsings matched to a word's surface form

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |      120151 |

**Examples**
```
0
1
2
3
4
```

[back to node types](#Node-Types)
<hr>

