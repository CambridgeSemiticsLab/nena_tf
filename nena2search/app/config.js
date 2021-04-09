const config = {
 "captions": {
  "title": "NENA phono search"
 },
 "name": "nena",
 "description": "\n<p>Phonetic search interface for the Northeastern Neo-Aramaic Text-Fabric Corpus.</p>\n<p>Based on <a href=\"https://github.com/CambridgeSemiticsLab/nena_tf\" target=\"_blank\">NENA data in Text-Fabric format</a>.</p>\n<p>See the\n<a href=\"https://github.com/CambridgeSemiticsLab/nena_tf/blob/master/docs/features.md\" target=\"_blank\">data documentation</a>.</p>\n<p>This is a standalone app. You download it to your computer, and then it works without\nconnection to the internet.</p>\n<p>This web app is by:</p>\n<ul>\n<li> <a href=\"https://www.ames.cam.ac.uk/people/professor-geoffrey-khan\" target=\"_blank\">Geoffrey Khan</a> (initiator)\n<li> <a href=\"https://www.linkedin.com/in/cody-kingham-1135018a\" target=\"_blank\">Cody Kingham</a> (corpus developer)\n<li> <a href=\"https://pure.knaw.nl/portal/en/persons/dirk-roorda\" target=\"_blank\">Dirk Roorda</a> (software developer)\n</ul>\n",
 "containerType": "sentence",
 "ntypes": [
  "word",
  "sentence",
  "line",
  "text"
 ],
 "dtypeOf": {
  "sentence": "word",
  "line": "sentence",
  "text": "line"
 },
 "utypeOf": {
  "word": "sentence",
  "sentence": "line",
  "line": "text"
 },
 "show": {
  "word": {
   "lang": false,
   "speaker": true,
   "text": true,
   "full": false,
   "fuzzy": true,
   "lite": false,
   "cls": true,
   "voice": false,
   "place": false,
   "manner": false
  },
  "line": {
   "number": true
  },
  "text": {
   "title": true,
   "dialect": true,
   "tid": false,
   "place": false
  }
 },
 "levels": {
  "word": "Some words are affixed to others without intervening space.",
  "sentence": "Sentences are delimited by full stops.",
  "line": "Lines are really paragraphs.",
  "text": "Texts are stories, having some metadata, consisting of lines."
 },
 "layers": {
  "word": {
   "lang": {
    "map": {
     "NENA": 1,
     "K.": 2,
     "A.": 3,
     "K./A.": 4,
     "A.|A.|K.": 5,
     "A.|K.": 6,
     "K./T.": 7,
     "K.|K.": 8,
     "K.|K.|K.": 9,
     "A.|A.": 10,
     "Urm.": 11,
     "E.": 12,
     "K./A./E.": 13,
     "P.": 14,
     "A./K.": 15,
     "K./A.|K./A.": 16,
     "T.": 17,
     "Ṭiy.": 18,
     "A./E.": 19,
     "K./E.": 20,
     "K./T.|K./T.": 21
    },
    "pos": "lang",
    "value": "",
    "description": "language, indicated by a number"
   },
   "speaker": {
    "map": {
     "Dawið ʾAdam": 1,
     "Yulia Davudi": 2,
     "Yuwarəš Xošăba Kena": 3,
     "Manya Givoyev": 4,
     "Yuwəl Yuḥanna": 5,
     "Nanəs Bənyamən": 6,
     "Yosəp bet Yosəp": 7,
     "Yonan Petrus": 8,
     "Natan Khoshaba": 9,
     "Arsen Mikhaylov": 10,
     "Xošebo ʾOdišo": 11,
     "Nancy George": 12,
     "Awiko Sulaqa": 13,
     "Maryam Gwirgis": 14,
     "Alice Bet-Yosəp": 15,
     "Bənyamən Bənyamən": 16,
     "MB": 17,
     "Mišayel Barčəm": 18,
     "Nadia Aloverdova": 19,
     "Frederic Ayyubkhan": 20,
     "Victor Orshan": 21,
     "Merab Badalov": 22,
     "Sophia Danielova": 23,
     "Blandina Barwari": 24,
     "YD": 25,
     "Dawið Gwərgəs": 26,
     "Gwərgəs Dawið": 27,
     "AB": 28,
     "Jacob Petrus": 29,
     "Dawid Adam": 30,
     "NK": 31,
     "YP": 32,
     "JP": 33,
     "Kena Kena": 34,
     "Nawiya ʾOdišo": 35,
     "GK": 36,
     "Leya ʾOraha": 37
    },
    "pos": "speaker",
    "value": "",
    "description": "speaker, indicated by a number"
   },
   "text": {
    "map": null,
    "pos": "text",
    "value": "",
    "description": "text precise, complete, uses non-ascii: <code>maqəlbə̀nna</code>"
   },
   "full": {
    "map": null,
    "pos": "full",
    "value": "",
    "description": "text representation: <code>maq9lb9`nna</code>"
   },
   "fuzzy": {
    "map": null,
    "pos": "fuzzy",
    "value": "mute",
    "description": "text representation: <code>maqilbinna</code>"
   },
   "lite": {
    "map": null,
    "pos": "lite",
    "value": "",
    "description": "text representation: <code>maq9lb9nna</code>"
   },
   "cls": {
    "map": {
     "vowel": "V",
     "consonant": "C"
    },
    "pos": "cls",
    "value": "",
    "description": "phonetic class: <code>CVCVCCVCCV</code>"
   },
   "voice": {
    "map": {
     "plain": "P",
     "unvoiced_aspirated": "H",
     "voiced": "V",
     "unvoiced": "F",
     "unvoiced_unaspirated": "G",
     "emphatic": "X"
    },
    "pos": "cls",
    "value": "",
    "description": "phonation: <code>PzzzPVzPPz</code>"
   },
   "place": {
    "map": {
     "dental-alveolar": "D",
     "labial": "B",
     "palatal-alveolar": "C",
     "palatal": "J",
     "velar": "G",
     "uvular": "X",
     "pharyngeal": "Q",
     "laryngeal": "H"
    },
    "pos": "cls",
    "value": "",
    "description": "phonation: <code>BzXzDBzDDz</code>"
   },
   "manner": {
    "map": {
     "affricative": "A",
     "nasal": "N",
     "other": "X",
     "fricative": "F",
     "lateral": "L",
     "sibilant": "S"
    },
    "pos": "cls",
    "value": "",
    "description": "phonation: <code>NzAzLAzNNz</code>"
   }
  },
  "line": {
   "number": {
    "map": null,
    "pos": "number",
    "value": "",
    "description": "line number"
   }
  },
  "text": {
   "title": {
    "map": null,
    "pos": "title",
    "value": "A",
    "description": "title of a text"
   },
   "dialect": {
    "map": null,
    "pos": "dialect",
    "value": "",
    "description": "dialect of a text <code>Barwar Urmi_C</code>"
   },
   "tid": {
    "map": null,
    "pos": "tid",
    "value": "",
    "description": "id of a text"
   },
   "place": {
    "map": null,
    "pos": "place",
    "value": "Dure",
    "description": "place of a text"
   }
  }
 }
}