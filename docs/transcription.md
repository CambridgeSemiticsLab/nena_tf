Rules/Preferences:

- one symbol must be represented by one transcription character
- transcription characters are present on US Intl. keyboard layout
- no transcription character can occur in the text with another meaning (not counting punctuation)
- consonants can be combined with at most one diacritic mark above and one below
- vowels can be combined with at most one quality accent and one stress accent
- characters precede their combining diacritics/accents
- diacritics above precede diacritics below
- quality accents (macron, breve, diaeresis, tilde) precede stress accents (grave, acute)

For our current corpus that implies:

- not usable (used as character or marker):

      +|=-

- doubtful (used to mark comments, not implemented yet):

      ()[]:

- available characters:

      `1234567890~!@#$%^&*_{}/\<>'",.:;?

Below a proposal that tries to follow the rules, and attempts
to choose symbols that are as intuitive as possible within
the given restrictions.

Issues:

- using the quotes may be problematic: they are not attested so far,
  but may not be unlikely to occur in future texts?
- using visually similar symbols may actually be confusing
  (e.g. which of < > ^ is which caron/circumflex?)

- vowels:

      a e i o u

      ı 1
      ɑ @
      ə 3
      ɛ $

- combining vowel diacritics:

      à ` 0x0300 grave
      á ' 0x0301 acute
      ā _ 0x0304 macron
      ă % 0x0306 breve
      ä " 0x0308 diaeresis
      ã ~ 0x0303 tilde

- consonants:

      b c d f g h j k l m n p q r s t v w x y z

      ð 6
      ɟ &
      Ɉ ?
      θ 8
      ʸ 7 0x02B8 small Y
      ʾ } 0x02BE right half ring
      ʿ { 0x02BF left half ring

- combining consonant diacritics:

      ĉ p̂ ġ č š ž ḍ ḥ ḷ ṃ p̣ ṛ ṣ ṭ ẓ ð̣ č̣ c̭ k̭ p̭ ṱ č̭

      x̌ < 0x030C caron
      x̂ ^ 0x0302 circumflex
      ẋ ; 0x0307 dot above
      x̣ . 0x0323 dot below
      x̭ > 0x032D circumflex below

- remaining available characters:

      24590!#*/\,:


