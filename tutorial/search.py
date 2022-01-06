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
# <img align="right" src="images/etcbc.png" width="128"/>
# <img align="right" src="images/dans.png" width="128"/>
#
# ---
#
# To get started: consult [start](start.ipynb)
#
# ---
#
# # Search Introduction
#
# *Search* in Text-Fabric is a template based way of looking for structural patterns in your dataset.
#
# It is inspired by the idea of
# [topographic query](http://books.google.nl/books?id=9ggOBRz1dO4C).
#
# Within Text-Fabric we have the unique possibility to combine the ease of formulating search templates for
# complicated patterns with the power of programmatically processing the results.
#
# This notebook will show you how to get up and running.
#
# ## Alternative for hand-coding
#
# Search is a powerful feature for a wide range of purposes.
#
# Quite a bit of the implementation work has been dedicated to optimize performance.
# Yet I do not pretend to have found optimal strategies for all
# possible search templates.
# Some search tasks may turn out to be somewhat costly or even very costly.
#
# That being said, I think search might turn out helpful in many cases,
# especially by reducing the amount of hand-coding needed to work with special subsets of your data.
#
# ## Easy command
#
# Search is as simple as saying (just an example)
#
# ```python
# results = A.search(template)
# A.show(results)
# ```
#
# See all ins and outs in the
# [search template docs](https://annotation.github.io/text-fabric/tf/about/searchusage.html).

# %load_ext autoreload
# %autoreload 2

from tf.app import use

A = use("nena:clone", checkout="clone", hoist=globals())
# A = use('nena', hoist=globals())

# # Basic search command
#
# We start with the most simple form of issuing a query.
#
# Let's look for the foreign words.

query = """
word foreign
"""
results = A.search(query)
A.table(results, end=10)

A.table(results, end=3, condensed=True, condenseType="line")

# We can show them in rich layout as well:

A.table(results, end=3, condensed=True, condenseType="line", fmt="layout-orig-full")

# Note that we can choose start and/or end points in the results list.

A.table(
    results,
    start=100,
    end=103,
    condensed=True,
    condenseType="stress",
    fmt="layout-orig-full",
)

# We can show the results more fully with `show()`.

A.show(results, fmt="layout-orig-full", start=1, end=3)

# As you see, you have total control.

# ---
#
# All chapters:
#
# * **[start](start.ipynb)** become an expert in creating pretty displays of your text structures
# * **[display](display.ipynb)** become an expert in creating pretty displays of your text structures
# * **search** turbo charge your hand-coding with search templates
# * **[exportExcel](exportExcel.ipynb)** make tailor-made spreadsheets out of your results
# * **[share](share.ipynb)** draw in other people's data and let them use yours
# * **[similarLines](similarLines.ipynb)** spot the similarities between lines
#
# ---
#
# See the [cookbook](cookbook) for recipes for small, concrete tasks.
#
# CC-BY Dirk Roorda
