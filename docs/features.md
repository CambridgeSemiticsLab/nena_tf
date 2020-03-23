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

| node type   | description                                         |   frequency | features                                                                                                                                                                                                                                                                                                                                    |
|:------------|:----------------------------------------------------|------------:|:--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| dialect     | dialect of North Eastern Neo-Aramaic                |           2 | [dialect](#dialect)                                                                                                                                                                                                                                                                                                                         |
| text        | transcribed story from a native NENA informant      |         126 | [title](#title), [informant](#informant), [text_id](#text_id), [place](#place)                                                                                                                                                                                                                                                              |
| paragraph   | paragraph segment based on newlines                 |         351 | [number](#number)                                                                                                                                                                                                                                                                                                                           |
| line        | verse-like section                                  |        2544 | [number](#number)                                                                                                                                                                                                                                                                                                                           |
| sentence    | sentence based on full stops (period)               |       16707 |                                                                                                                                                                                                                                                                                                                                             |
| subsentence | part of sentence based on commas, semi-colons, etc. |       24527 |                                                                                                                                                                                                                                                                                                                                             |
| inton       | intonation group based on ˈ symbol                  |       35984 |                                                                                                                                                                                                                                                                                                                                             |
| stress      | stress group based on hyphenation & spacing         |       93762 |                                                                                                                                                                                                                                                                                                                                             |
| word        | word in NENA or other language                      |      120148 | [full](#full), [fuzzy](#fuzzy), [lite_end](#lite_end), [lite](#lite), [lemma_form](#lemma_form), [gloss](#gloss), [lang](#lang), [speaker](#speaker), [end](#end), [comment](#comment), [grm_desc](#grm_desc), [text](#text), [full_end](#full_end), [text_norm](#text_norm), [lemma](#lemma), [foreign](#foreign), [fuzzy_end](#fuzzy_end) |
| letter      | an individual letter including diacritics           |      539381 | [full](#full), [fuzzy](#fuzzy), [lite_end](#lite_end), [lite](#lite), [end](#end), [class](#class), [text](#text), [full_end](#full_end), [fuzzy_end](#fuzzy_end)                                                                                                                                                                           |

# Features

## dialect

name of a dialect in Northeastern Neo-Aramaic

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| dialect     |           2 |

**Values**
| dialect   |   frequency |
|:----------|------------:|
| Barwar    |           1 |
| Urmi_C    |           1 |

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
| šošət Xere                                    | Barwar    |
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

## number

sequential number of a paragraph or line within a text or paragraph, respectively

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| paragraph   |         351 |
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

plain text representation of a letter or word

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |      120148 |
| letter      |      539381 |


See the [transcription tables](transcription.md).

[back to node types](#Node-Types)
<hr>

## text_norm

plain text without accents

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |      120148 |


See the [transcription tables](transcription.md).

[back to node types](#Node-Types)
<hr>

## full

full transcription, one-to-one transcription of a letter or word

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |      120148 |
| letter      |      539381 |


See the [transcription tables](transcription.md).

[back to node types](#Node-Types)
<hr>

## lite

lite transcription of a letter or word, without vowel accents

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |      120148 |
| letter      |      539381 |


See the [transcription tables](transcription.md).

[back to node types](#Node-Types)
<hr>

## fuzzy

fuzzy transcription that leaves out most diacritics and maps certain characters in certain dialects to common characters

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |      120148 |
| letter      |      539381 |


See the [transcription tables](transcription.md).

[back to node types](#Node-Types)
<hr>

## end

space, punctuation, or other stylistic text at the end a letter or word

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |      120148 |
| letter      |      539381 |


See the [transcription tables](transcription.md).

[back to node types](#Node-Types)
<hr>

## full_end

full transcription of punctuation or other stylistic text at the end of a letter or word; see also trans_f

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |      120148 |
| letter      |      539381 |


See the [transcription tables](transcription.md).

[back to node types](#Node-Types)
<hr>

## lite_end

lite transcription of punctuation or other stylistic text at the end of a letter or word, excluding intonation boundary markers; see also trans_l

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |      120148 |
| letter      |      539381 |


See the [transcription tables](transcription.md).

[back to node types](#Node-Types)
<hr>

## fuzzy_end

fuzzy transcription of punctuation or other stylistic text at the end of a letter or word, excluding intonation boundary markers; see also trans_l

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |      120148 |
| letter      |      539381 |


See the [transcription tables](transcription.md).

[back to node types](#Node-Types)
<hr>

## speaker

name or initials of person speaking a word; see also informant

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |      120148 |

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
| word        |         462 |

**Values**
| lang   |   frequency |
|:-------|------------:|
| R      |         160 |
| P      |         138 |
| E      |          80 |
| Az     |          59 |
| Arm    |          20 |
| Ge     |           3 |
| F      |           2 |

[back to node types](#Node-Types)
<hr>

## foreign

indicates whether a word is foreign; see also lang

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |         534 |

**Values**
| foreign   |   frequency |
|:----------|------------:|
| True      |         534 |

[back to node types](#Node-Types)
<hr>

## comment

explanatory comment inserted in the text, stored on a word

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |           1 |

**Examples**
```
*interruption*
```

[back to node types](#Node-Types)
<hr>

## informant

name of main person who spoke this text

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| text        |         126 |

**Values**
| informant           |   frequency |
|:--------------------|------------:|
| Yulia Davudi        |          37 |
| Dawið ʾAdam         |          14 |
| Yuwəl Yuḥanna       |           7 |
| Maryam Gwirgis      |           6 |
| Yuwarəš Xošăba Kena |           6 |
| Awiko Sulaqa        |           5 |
| Xošebo ʾOdišo       |           5 |
| Bənyamən Bənyamən   |           4 |
| Manya Givoyev       |           4 |
| Gwərgəs Dawið       |           3 |
| Nadia Aloverdova    |           3 |
| Nancy George        |           3 |
| Natan Khoshaba      |           3 |
| Victor Orshan       |           3 |
| Yosəp bet Yosəp     |           3 |
| Alice Bet-Yosəp     |           2 |
| Arsen Mikhaylov     |           2 |
| Frederic Ayyubkhan  |           2 |
| Sophia Danielova    |           2 |
| Yonan Petrus        |           2 |
| Blandina Barwari    |           1 |
| Dawid Adam          |           1 |
| Dawið Gwərgəs       |           1 |
| Jacob Petrus        |           1 |
| Kena Kena           |           1 |
| Leya ʾOraha         |           1 |
| Merab Badalov       |           1 |
| Mišayel Barčəm      |           1 |
| Nanəs Bənyamən      |           1 |
| Nawiya ʾOdišo       |           1 |

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

## class

class of a letter (consonant or vowel)

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| letter      |      539381 |

**Values**
| class     |   frequency |
|:----------|------------:|
| consonant |      311071 |
| vowel     |      228310 |

[back to node types](#Node-Types)
<hr>

## lemma

lemma of a word

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |       28963 |

**Examples**
```
w, ʾu-
xa, xaʾa
ṱ
b-
gu-
```

[back to node types](#Node-Types)
<hr>

## lemma_form

grammatical form of a word lemma

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |        2276 |

**Examples**
```
pl.
f.
abs.
sing.
f. and pl.
```

[back to node types](#Node-Types)
<hr>

## grm_desc

grammatical description of a word lemma

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |       28963 |

**Values**
| grm_desc       |   frequency |
|:---------------|------------:|
| n.m.           |        5734 |
| part.          |        4766 |
| prep.          |        3720 |
| n.f.           |        3245 |
|                |        2934 |
| num.           |        1893 |
| adj.           |         893 |
| adv.           |         868 |
| mod.           |         852 |
| pron. cs.      |         759 |
| pron. ms.      |         684 |
| pron. pl.      |         462 |
| part. pron.    |         455 |
| pron. fs.      |         434 |
| part., prep.   |         127 |
| n.pl.tan.      |         118 |
| adj. invar.    |         115 |
| adj. adv. mod. |         113 |
| mod. adv.      |         110 |
| n.pl.          |         103 |
| n.m./f.        |          89 |
| m.             |          84 |
| pron.          |          79 |
| n.m./adj.      |          74 |
| interj.        |          59 |
| n.f./m.        |          31 |
| n.f            |          24 |
| m.n.           |          20 |
| n.m            |          20 |
| pron. mod.     |          19 |
| n.m. adv./adj. |          16 |
| n.pl.tant.     |          14 |
| adj. cs.       |           8 |
| n.f./adj.f     |           7 |
| n.m.,          |           6 |
| n.m..          |           6 |
| cst.           |           5 |
| n.f./m.,       |           4 |
| n.m. adj.      |           4 |
| adj. m.        |           3 |
| n.m. adv. adj. |           2 |
| pl.            |           2 |
| f.             |           1 |
| imper. pl.     |           1 |

[back to node types](#Node-Types)
<hr>

## gloss

English gloss of a word lemma

**Node Counts**
| node type   |   frequency |
|:------------|------------:|
| word        |       28963 |

**Examples**
```

and
one; a 
in, at, on, with, by means of.
speaker deixis demonstrative 
```

[back to node types](#Node-Types)
<hr>

