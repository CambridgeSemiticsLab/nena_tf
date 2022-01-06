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
# # Sharing data features
#
# ## Explore additional data
#
# Once you analyse a corpus, it is likely that you produce data that others can reuse.
# Maybe you have defined a set of proper name occurrences, or special numerals, or you have computed part-of-speech assignments.
#
# It is possible to turn these insights into *new features*, i.e. new `.tf` files with values assigned to specific nodes.
#
# ## Make your own data
#
# New data is a product of your own methods and computations in the first place.
# But how do you turn that data into new TF features?
# It turns out that the last step is not that difficult.
#
# If you can shape your data as a mapping (dictionary) from node numbers (integers) to values
# (strings or integers), then TF can turn that data into a feature file for you with one command.
#
# ## Share your new data
# You can then easily share your new features on GitHub, so that your colleagues everywhere
# can try it out for themselves.
#
# You can add such data on the fly, by passing a `mod={org}/{repo}/{path}` parameter,
# or a bunch of them separated by commas.
#
# If the data is there, it will be auto-downloaded and stored on your machine.
#
# Let's do it.

# %load_ext autoreload
# %autoreload 2

# +

import os
from tf.app import use

# -

A = use("nena:clone", checkout="clone", hoist=globals())
# A = use('nena', hoist=globals())

# # Making data
#
# (to be done)

cert = None

# # Saving data
#
# The [documentation](https://annotation.github.io/text-fabric/tf/core/fabric.html#tf.core.fabric.FabricCore.save)
# explains how to save this data into a text-fabric
# data file.

GITHUB = os.path.expanduser("~/github")
ORG = "CambridgeSemiticsLab"
REPO = "nena"
PATH = "exercises"
VERSION = A.version

# Note the version: we have built the version against a specific version of the data:

A.version

# Later on, we pass this version on, so that users of our data will get the shared data in exactly the same version as their core data.

# We have to specify a bit of metadata for this feature:

metaData = {
    "cert": dict(
        valueType="int",
        description="to be filled in",
        creator="Cody Kingham et al.",
    ),
}

# Now we can give the save command:

TF.save(
    nodeFeatures=dict(cert=cert),
    metaData=metaData,
    location=f"{GITHUB}/{ORG}/{REPO}/{PATH}/tf",
    module=VERSION,
)

# # Sharing data
#
# How to share your own data is explained in the
# [documentation](https://annotation.github.io/text-fabric/tf/about/datasharing.html).
#
# If you commit your changes to the exercises repo, and have done a `git push origin master`,
# you already have shared your data!
#
# If you want to make a stable release, so that you can keep developing, while your users fall back
# on the stable data, you can make a new release.
#
# Go to the GitHub website for that, go to your repo, and click *Releases* and follow the nudges.
#
# If you want to make it even smoother for your users, you can zip the data and attach it as a binary to the release just created.
#
# We need to zip the data in exactly the right directory structure. Text-Fabric can do that for us:

# + language="sh"
#
# text-fabric-zip CambridgeSemiticsLab/nena/exercises/tf
# -

# All versions have been zipped, but it works OK if you only attach the newest version to the newest release.
#
# If a user asks for an older version in this release, the system can still find it.

# # Use the data
#
# We can use the data by calling it up when we say `use('nena', ...)`.
#
# Here is how:
#
# (use the line without `clone` if the data is really published,
# use the line with `clone` if you want to test your local copy of the feature).

A = use("nena", hoist=globals(), mod="CambridgeSemiticsLab/nena/exercises/tf")
# A = use('dss', hoist=globals(), mod='etcbc/dss/exercises/tf:clone')

# Above you see a new section in the feature list: **CambridgeSemiticsLab/nena/exercises/tf** with our new features in it.
#
# Now, suppose did not know much about this feature, then we would like to do a few basic checks:

F.xxx.freqList()

# Which nodes have the lowest uncertainty?

# # All together!
#
# If more researchers have shared data modules, you can draw them all in.
#
# Then you can design queries that use features from all these different sources.
#
# In that way, you build your own research on top of the work of others.

# Hover over the features to see where they come from, and you'll see they come from your local github repo.

# ---
#
# All chapters:
#
# * **[start](start.ipynb)** become an expert in creating pretty displays of your text structures
# * **[display](display.ipynb)** become an expert in creating pretty displays of your text structures
# * **[search](search.ipynb)** turbo charge your hand-coding with search templates
# * **[exportExcel](exportExcel.ipynb)** make tailor-made spreadsheets out of your results
# * **share** draw in other people's data and let them use yours
# * **[similarLines](similarLines.ipynb)** spot the similarities between lines
#
# ---
#
# See the [cookbook](cookbook) for recipes for small, concrete tasks.
