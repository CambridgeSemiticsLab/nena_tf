# ---
# jupyter:
#   jupytext:
#     text_representation:
#       extension: .py
#       format_name: light
#       format_version: '1.5'
#       jupytext_version: 1.11.4
#   kernelspec:
#     display_name: Python 3
#     language: python
#     name: python3
# ---

# <img align="right" src="images/tf.png" width="128"/>
# <img align="right" src="images/logo.png" width="128"/>
# <img align="right" src="images/dans.png" width="128"/>
#
# # Tutorial
#
# This notebook gets you started with using
# [Text-Fabric](https://annotation.github.io/text-fabric/) for coding in NENA, a Neo Aramaic Corpus maintained at
# Cambridge University.
#
# Familiarity with the underlying
# [data model](https://annotation.github.io/text-fabric/tf/about/datamodel.html)
# is recommended.

# ## Installing Text-Fabric
#
# ### Python
#
# You need to have Python on your system. Most systems have it out of the box,
# but alas, that is python2 and we need at least python **3.6**.
#
# Install it from [python.org](https://www.python.org) or from
# [Anaconda](https://www.anaconda.com/download).
#
# ### TF itself
#
# ```
# pip3 install text-fabric
# ```
#
# ### Jupyter notebook
#
# You need [Jupyter](http://jupyter.org).
#
# If it is not already installed:
#
# ```
# pip3 install jupyter
# ```

# ## Tip
# If you cloned the repository containing this tutorial,
# first copy its parent directory to somewhere outside your clone of the repo,
# before computing with this it.
#
# If you pull changes from the repository later, it will not conflict with
# your computations.
#
# Where you put your tutorial directory is up to you.
# It will work from any directory.

# ## Cookbook
#
# This tutorial and its sister tutorials are meant to showcase most of things TF can do.
#
# But we also have a [cookbook](cookbook) with a set of focused recipes on tricky things.

# ## Data
#
# Text-Fabric will fetch the data set for you from github, and check for updates.
#
# The data will be stored in the `text-fabric-data` in your home directory.

# # Features
# The data of the corpus is organized in features.
# They are *columns* of data.
# Think of the corpus as a gigantic spreadsheet, where row 1 corresponds to the
# first sign, row 2 to the second sign, and so on, for all ~ 1.5 M signs,
# followed by ~ 500 K word nodes and yet another 200 K nodes of other types.
#
# The information which reading each sign has, constitutes a column in that spreadsheet.
# The DSS corpus contains > 50 columns.
#
# Instead of putting that information in one big table, the data is organized in separate columns.
# We call those columns **features**.

# %load_ext autoreload
# %autoreload 2

import os
import collections

# # Incantation
#
# The simplest way to get going is by this *incantation*:

from tf.app import use

# For the very last version, use `hot`.
#
# For the latest release, use `latest`.
#
# If you have cloned the repos (TF app and data), use `clone`.
#
# If you do not want/need to upgrade, leave out the checkout specifiers.

A = use("nena:clone", checkout="clone", hoist=globals())
# A = use('nena:hot', checkout='hot', hoist=globals())
# A = use('nena:latest', checkout='latest', hoist=globals())
# A = use('nena', hoist=globals())

# You can see which features have been loaded, and if you click on a feature name, you find its documentation.
# If you hover over a name, you see where the feature is located on your system.

# ## API
#
# The result of the incantation is that we have a bunch of special variables at our disposal
# that give us access to the text and data of the corpus.
#
# At this point it is helpful to throw a quick glance at the text-fabric API documentation
# (see the links under **API Members** above).
#
# The most essential thing for now is that we can use `F` to access the data in the features
# we've loaded.
# But there is more, such as `N`, which helps us to walk over the text, as we see in a minute.
#
# The **API members** above show you exactly which new names have been inserted in your namespace.
# If you click on these names, you go to the API documentation for them.

# ## Search
# Text-Fabric contains a flexible search engine, that does not only work for the data,
# of this corpus, but also for other corpora and data that you add to corpora.
#
# **Search is the quickest way to come up-to-speed with your data, without too much programming.**
#
# Jump to the dedicated [search](search.ipynb) search tutorial first, to whet your appetite.
#
# The real power of search lies in the fact that it is integrated in a programming environment.
# You can use programming to:
#
# * compose dynamic queries
# * process query results
#
# Therefore, the rest of this tutorial is still important when you want to tap that power.
# If you continue here, you learn all the basics of data-navigation with Text-Fabric.

# # Counting
#
# In order to get acquainted with the data, we start with the simple task of counting.
#
# ## Count all nodes
# We use the
# [`N.walk()` generator](https://annotation.github.io/text-fabric/tf/core/nodes.html#tf.core.nodes.Nodes.walk)
# to walk through the nodes.
#
# We compared the TF data to a gigantic spreadsheet, where the rows correspond to the signs.
# In Text-Fabric, we call the rows `slots`, because they are the textual positions that can be filled with signs.
#
# We also mentioned that there are also other textual objects.
# They are the clusters, lines, faces and documents.
# They also correspond to rows in the big spreadsheet.
#
# In Text-Fabric we call all these rows *nodes*, and the `N()` generator
# carries us through those nodes in the textual order.
#
# Just one extra thing: the `info` statements generate timed messages.
# If you use them instead of `print` you'll get a sense of the amount of time that
# the various processing steps typically need.

# +
A.indent(reset=True)
A.info("Counting nodes ...")

i = 0
for n in N.walk():
    i += 1

A.info("{} nodes".format(i))
# -

# Here you see it: a bit less than 1M nodes.

# ## What are those nodes?
# Every node has a type, like sign, or line, face.
# But what exactly are they?
#
# Text-Fabric has two special features, `otype` and `oslots`, that must occur in every Text-Fabric data set.
# `otype` tells you for each node its type, and you can ask for the number of `slot`s in the text.
#
# Here we go!

F.otype.slotType

F.otype.maxSlot

F.otype.maxNode

F.otype.all

C.levels.data

# This is interesting: above you see all the textual objects, with the average size of their objects,
# the node where they start, and the node where they end.

# ## Count individual object types
# This is an intuitive way to count the number of nodes in each type.
# Note in passing, how we use the `indent` in conjunction with `info` to produce neat timed
# and indented progress messages.

# +
A.indent(reset=True)
A.info("counting objects ...")

for otype in F.otype.all:
    i = 0

    A.indent(level=1, reset=True)

    for n in F.otype.s(otype):
        i += 1

    A.info("{:>7} {}s".format(i, otype))

A.indent(level=0)
A.info("Done")
# -

# # Viewing textual objects
#
# You can use the A API (the extra power) to display cuneiform text.
#
# See the [display](display.ipynb) tutorial.

# # Feature statistics
#
# `F`
# gives access to all features.
# Every feature has a method
# `freqList()`
# to generate a frequency list of its values, higher frequencies first.

F.speaker.freqList()

# Words and morphemes have the feature `foreign`. We can count them separately:

F.foreign.freqList("word")

F.foreign.freqList("morpheme")

# # Word matters
#
# ## Top 20 frequent words
#
# We count words by their lemma.

for (w, amount) in F.lemma.freqList()[0:20]:
    print(f"{amount:>5} {w}")

# ## Word distribution
#
# Let's do a bit more fancy word stuff.
#
# ### Hapaxes
#
# A hapax can be found by picking the words with frequency 1.
#
# We print 20 hapaxes.

hapaxes1 = sorted(lx for (lx, amount) in F.lemma.freqList() if amount == 1)
len(hapaxes1)

for lx in hapaxes1[0:20]:
    print(lx)

# ### Small occurrence base
#
# The occurrence base of a word are the scrolls in which occurs.
#
# We compute the occurrence base of each word, based on lexemes according to the `glex` feature.

# +
occurrenceBase1 = collections.defaultdict(set)

A.indent(reset=True)
A.info("compiling occurrence base ...")
for w in F.otype.s("word"):
    text = T.sectionFromNode(w)[1]
    occurrenceBase1[F.lemma.v(w)].add(text)
A.info(f"{len(occurrenceBase1)} entries")
# -

# Wow, that took long!
#
# We looked up the text for each word.
#
# But there is another way:
#
# Start with texts, and iterate through their words.

# +
occurrenceBase2 = collections.defaultdict(set)

A.indent(reset=True)
A.info("compiling occurrence base ...")
for s in F.otype.s("text"):
    text = F.title.v(s)
    for w in L.d(s, otype="word"):
        occurrenceBase2[F.lemma.v(w)].add(text)
A.info("done")
A.info(f"{len(occurrenceBase2)} entries")
# -

# Much better. Are the results equal?

occurrenceBase1 == occurrenceBase2

# Yes.

occurrenceBase = occurrenceBase2

# An overview of how many words have how big occurrence bases:

# +
occurrenceSize = collections.Counter()

for (w, scrolls) in occurrenceBase.items():
    occurrenceSize[len(scrolls)] += 1

occurrenceSize = sorted(
    occurrenceSize.items(),
    key=lambda x: (-x[1], x[0]),
)

for (size, amount) in occurrenceSize[0:10]:
    print(f"base size {size:>4} : {amount:>5} words")
print("...")
for (size, amount) in occurrenceSize[-10:]:
    print(f"base size {size:>4} : {amount:>5} words")
# -

# Let's give the predicate *private* to those words whose occurrence base is a single text.

privates = {w for (w, base) in occurrenceBase.items() if len(base) == 1}
len(privates)

# ### Peculiarity of texts
#
# As a final exercise with texts, lets make a list of all texts, and show their
#
# * total number of words
# * number of private words
# * the percentage of private words: a measure of the peculiarity of the text

# +
textList = []

empty = set()
ordinary = set()

for d in F.otype.s("text"):
    text = F.title.v(d)
    words = {F.lemma.v(w) for w in L.d(d, otype="word")}
    a = len(words)
    if not a:
        empty.add(text)
        continue
    o = len({w for w in words if w in privates})
    if not o:
        ordinary.add(text)
        continue
    p = 100 * o / a
    textList.append((text, a, o, p))

textList = sorted(textList, key=lambda e: (-e[3], -e[1], e[0]))

print(f"Found {len(empty):>4} empty texts")
print(f"Found {len(ordinary):>4} ordinary texts (i.e. without private words)")

# +
print(
    "{:<50}{:>5}{:>5}{:>5}\n{}".format(
        "text",
        "#all",
        "#own",
        "%own",
        "-" * 35,
    )
)

for x in textList[0:20]:
    print("{:<50} {:>4} {:>4} {:>4.1f}%".format(*x))
print("...")
for x in textList[-20:]:
    print("{:<50} {:>4} {:>4} {:>4.1f}%".format(*x))
# -

# # Locality API
# We travel upwards and downwards, forwards and backwards through the nodes.
# The Locality-API (`L`) provides functions: `u()` for going up, and `d()` for going down,
# `n()` for going to next nodes and `p()` for going to previous nodes.
#
# These directions are indirect notions: nodes are just numbers, but by means of the
# `oslots` feature they are linked to slots. One node *contains* an other node, if the one is linked to a set of slots that contains the set of slots that the other is linked to.
# And one if next or previous to an other, if its slots follow or precede the slots of the other one.
#
# `L.u(node)` **Up** is going to nodes that embed `node`.
#
# `L.d(node)` **Down** is the opposite direction, to those that are contained in `node`.
#
# `L.n(node)` **Next** are the next *adjacent* nodes, i.e. nodes whose first slot comes immediately after the last slot of `node`.
#
# `L.p(node)` **Previous** are the previous *adjacent* nodes, i.e. nodes whose last slot comes immediately before the first slot of `node`.
#
# All these functions yield nodes of all possible otypes.
# By passing an optional parameter, you can restrict the results to nodes of that type.
#
# The result are ordered according to the order of things in the text.
#
# The functions return always a tuple, even if there is just one node in the result.
#
# ## Going up
# We go from the first word to the scroll it contains.
# Note the `[0]` at the end. You expect one scroll, yet `L` returns a tuple.
# To get the only element of that tuple, you need to do that `[0]`.
#
# If you are like me, you keep forgetting it, and that will lead to weird error messages later on.

firstText = L.u(1, otype="text")[0]
print(firstText)

# And let's see all the containing objects of letter 3:

s = 3
for otype in F.otype.all:
    if otype == F.otype.slotType:
        continue
    up = L.u(s, otype=otype)
    upNode = "x" if len(up) == 0 else up[0]
    print("letter {} is contained in {} {}".format(s, otype, upNode))

# ## Going next
# Let's go to the next nodes of the first text.

afterFirstText = L.n(firstText)
for n in afterFirstText:
    print(
        "{:>7}: {:<13} first slot={:<6}, last slot={:<6}".format(
            n,
            F.otype.v(n),
            E.oslots.s(n)[0],
            E.oslots.s(n)[-1],
        )
    )
secondText = L.n(firstText, otype="text")[0]

# ## Going previous
#
# And let's see what is right before the second text.

for n in L.p(secondText):
    print(
        "{:>7}: {:<13} first slot={:<6}, last slot={:<6}".format(
            n,
            F.otype.v(n),
            E.oslots.s(n)[0],
            E.oslots.s(n)[-1],
        )
    )

# ## Going down

# We go to the lines of the first text, and just count them.

lines = L.d(firstText, otype="line")
print(len(lines))

# # Text API
#
# So far, we have mainly seen nodes and their numbers, and the names of node types.
# You would almost forget that we are dealing with text.
# So let's try to see some text.
#
# In the same way as `F` gives access to feature data,
# `T` gives access to the text.
# That is also feature data, but you can tell Text-Fabric which features are specifically
# carrying the text, and in return Text-Fabric offers you
# a Text API: `T`.
#
# ## Formats
# DSS text can be represented in a number of ways:
#
# * `orig`: unicode
# * `trans`: ETCBC transcription
# * `source`: as in Abegg's data files
#
# All three can be represented in two flavours:
#
# * `full`: all glyphs, but no bracketings and flags
# * `extra`: everything
#
# If you wonder where the information about text formats is stored:
# not in the program text-fabric, but in the data set.
# It has a feature `otext`, which specifies the formats and which features
# must be used to produce them. `otext` is the third special feature in a TF data set,
# next to `otype` and `oslots`.
# It is an optional feature.
# If it is absent, there will be no `T` API.
#
# Here is a list of all available formats in this data set.

T.formats

# ## Using the formats
#
# The ` T.text()` function is central to get text representations of nodes. Its most basic usage is
#
# ```python
# T.text(nodes, fmt=fmt)
# ```
# where `nodes` is a list or iterable of nodes, usually word nodes, and `fmt` is the name of a format.
# If you leave out `fmt`, the default `text-orig-full` is chosen.
#
# The result is the text in that format for all nodes specified:

# You see for each format in the list above its intended level of operation: `letter` or `word`.
#
# If TF formats a node according to a defined text-format, it will descend to constituent nodes and represent those
# constituent nodes.
#
# In this case, no formats specify the `word` level as the descend type.

# If we do not specify a format, the **default** format is used (`text-orig-full`).

# We examine a portion of text material:

lineNode = T.nodeFromSection(("Barwar", "Gozali and Nozali", 8))
lineNode

letters = L.d(lineNode, otype="letter")
morphemes = L.d(lineNode, otype="morpheme")
words = L.d(lineNode, otype="word")
print(
    f"""
line {T.sectionFromNode(lineNode)} with
  {len(letters):>3} letters
  {len(morphemes):>3} morphemes
  {len(words):>3} words
"""
)

T.text(letters[0:50])

T.text(morphemes[0:20])

T.text(words[0:10])

# ## Whole text in all formats in a few seconds
# Part of the pleasure of working with computers is that they can crunch massive amounts of data.
#
# We print the text in all formats.

# +
A.indent(reset=True)
A.info("writing plain text of all texts in all text formats")

formats = T.formats

text = collections.defaultdict(list)

for ln in F.otype.s("line"):
    for fmt in formats:
        if fmt.startswith("layout"):
            continue
        text[fmt].append(T.text(ln, fmt=fmt, descend=True))

A.info("done {} formats".format(len(text)))

for fmt in sorted(text):
    print("{}\n{}\n".format(fmt, "\n".join(text[fmt][0:5])))
# -

# ### The full plain text
# We write all formats to file, in your `Downloads` folder.

for fmt in T.formats:
    with open(
        os.path.expanduser(f"~/Downloads/{fmt}.txt"),
        "w",
        # encoding='utf8',
    ) as f:
        f.write("\n".join(text[fmt]))

# (if this errors, uncomment the line with `encoding`)

# ## Sections
#
# A section in the NENA corpus is a dialect, a text or a line.
# Knowledge of sections is not baked into Text-Fabric.
# The config feature `otext.tf` may specify three section levels, and tell
# what the corresponding node types and features are.
#
# From that knowledge it can construct mappings from nodes to sections, e.g. from line
# nodes to tuples of the form:
#
#     (dialect name, text title, line number)
#
# You can get the section of a node as a tuple of relevant dialect, text, and line nodes.
# Or you can get it as a passage label, a string.
#
# You can ask for the passage corresponding to the first slot of a node, or the one corresponding to the last slot.
#
# Here are examples of getting the section that corresponds to a node and vice versa.
#
# **NB:** `sectionFromNode` always delivers a line specification, either from the
# first slot belonging to that node, or, if `lastSlot`, from the last slot
# belonging to that node.

someNodes = (
    F.otype.s("letter")[100000],
    F.otype.s("word")[5000],
    F.otype.s("inton")[4000],
    F.otype.s("stress")[3000],
    F.otype.s("line")[1000],
    F.otype.s("text")[100],
    F.otype.s("dialect")[1],
)

for n in someNodes:
    nType = F.otype.v(n)
    d = f"{n:>7} {nType}"
    first = A.sectionStrFromNode(n)
    last = A.sectionStrFromNode(n, lastSlot=True, fillup=True)
    tup = (
        T.sectionTuple(n),
        T.sectionTuple(n, lastSlot=True, fillup=True),
    )
    print(f"{d:<16} - {tup}")
    print(f"    first: {first}")
    print(f"    last:  {last}")

# # Clean caches
#
# Text-Fabric pre-computes data for you, so that it can be loaded faster.
# If the original data is updated, Text-Fabric detects it, and will recompute that data.
#
# But there are cases, when the algorithms of Text-Fabric have changed, without any changes in the data, that you might
# want to clear the cache of precomputed results.
#
# There are two ways to do that:
#
# * Locate the `.tf` directory of your dataset, and remove all `.tfx` files in it.
#   This might be a bit awkward to do, because the `.tf` directory is hidden on Unix-like systems.
# * Call `TF.clearCache()`, which does exactly the same.
#
# It is not handy to execute the following cell all the time, that's why I have commented it out.
# So if you really want to clear the cache, remove the comment sign below.

# +
# TF.clearCache()
# -

# # Next steps
#
# By now you have an impression how to compute around in the corpus.
# While this is still the beginning, I hope you already sense the power of unlimited programmatic access
# to all the bits and bytes in the data set.
#
# Here are a few directions for unleashing that power.
#
# * **[display](display.ipynb)** become an expert in creating pretty displays of your text structures
# * **[search](search.ipynb)** turbo charge your hand-coding with search templates
# * **[exportExcel](exportExcel.ipynb)** make tailor-made spreadsheets out of your results
# * **[share](share.ipynb)** draw in other people's data and let them use yours
# * **[similarLines](similarLines.ipynb)** spot the similarities between lines
#
# ---
#
# See the [cookbook](cookbook) for recipes for small, concrete tasks.
#
# CC-BY Dirk Roorda