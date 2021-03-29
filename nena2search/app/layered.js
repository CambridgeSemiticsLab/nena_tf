/*eslint-env jquery*/

/* global corpus */

const NUMBER = 'number'
const MaxReLength = 1000

const decompress = data => {
  const result = new Map()
  for (const [nodeSpec, value] of data) {
    if (typeof nodeSpec === NUMBER) {
      result[nodeSpec] = value
    } else {
      for (const nodeRange of nodeSpec) {
        if (typeof nodeRange === NUMBER) {
          result[nodeRange] = value
        } else {
          for (let n = nodeRange[0]; n <= nodeRange[1]; n++) {
            result.set(n, value)
          }
        }
      }
    }
  }
  return result
}

const dressUp = () => {
  const {
    captions: { title },
  } = corpus
  $('head>title').html(title)
  $('#title').html(title)
}

const warmUp = () => {
  console.log(`Warm up positions for 'up'-relation`)
  corpus.up = decompress(corpus.up)
  const { positions } = corpus
  for (const [nType, typeInfo] of Object.entries(positions)) {
    for (const [name, pos] of Object.entries(typeInfo)) {
      console.log(`Warm up positions for ${nType}-${name}`)
      for (const i in pos) {
        if (pos[i] != null) {
          pos[i] = pos[i].split(',').map(parseInt)
        }
      }
    }
  }
}

const genLegend = (nType, name, info) => {
  const { map } = info
  const html = []

  if (map) {
    html.push(`
<details>
  <summary>${name}</summary>
`)
    for (const [acro, full] of Object.entries(map)) {
      html.push(`<div class="legend"><b>${acro}</b> = ${full}</div>`)
    }
    html.push(`
</details>
`)
  } else {
    html.push(`
<div>${name}</div>
`)
  }
  return html.join('')
}

const doSearch = (nType, name, info, regex) => {
  const text = corpus.texts[nType][name]
  const posKey = info.pos
  const positions = corpus.positions[nType][posKey]
  const searchResults = text.matchAll(regex)
  const resultPairs = []
  const nodeSet = new Set()
  for (const match of searchResults) {
    const hit = match[0]
    const start = match.index
    const end = start + hit.length
    const nodes = new Set()
    //console.log({ hit, start, end, nodes })
    for (let i = start; i < end; i++) {
      const moreNodes = positions[i]
      if (moreNodes != null) {
        for (const n of moreNodes) {
          resultPairs.push([i, n])
          nodeSet.add(n)
        }
      }
    }
  }
  return { resultPairs, nodeSet }
}

const gatherResults = () => {
  const { layers } = corpus

  const nTypeResults = {}
  /* keys: the node types for which successful searches have been performed
   * values: a pair. The first member of the pair is:
   * an object with keys: the names of the layers that were successfully searched
   * and values the pairs [i, node] where i is a position in the searched text
   * and n is a node that contains that position.
   * The second member a set of nodes obtained by taking the intersection
   * of the sets of nodes that occur in the results of each layer.
   * */

  for (const [nType, typeInfo] of Object.entries(layers)) {
    nTypeResults[nType] = { nodeSets: {}, resultPairs: {}, intersection: new Set() }

    // gather results for all layers having nType

    for (const [name, info] of Object.entries(typeInfo)) {
      const box = $(`#search_${nType}_${name}>input`)
      const ebox = $(`#search_${nType}_${name}>span`)
      ebox.val('')
      box.removeClass('error')
      const pattern = box.val()
      if (pattern == null || pattern == '') {
        continue
      }
      if (pattern.length > MaxReLength) {
        feedBack(
          box,
          ebox,
          `pattern must be less than ${MaxReLength} characters long`
        )
        continue
      }
      let regex
      try {
        regex = new RegExp(pattern, 'g')
      } catch (error) {
        feedBack(box, ebox, `'${pattern}': ${error}`)
        continue
      }

      const { resultPairs, nodeSets } = doSearch(nType, name, info, regex)
      nTypeResults[nType]["resultPairs"][name] = resultPairs
      nTypeResults[nType]["nodeSets"][name] = nodeSets
    }
  }
  return nTypeResults
}

const weedByNType = (nodeSets, intersection) => {
  // take the intersection of all nodeSets (all with the same nType)

  const theseSets = Object.entries(nodeSets)
  if (theseSets.length == 0) {
    return
  }
  const firstSet = theseSets[0][1]
  for (const n of firstSet) {
    intersection.add(n)
  }
  if (theseSets.length == 1) {
    return
  }
  for (const entry of theseSets.slice(1)) {
    const thisSet = entry[1]
    for (const n of intersection) {
      if (!thisSet.has(n)) {
        intersection.delete(n)
      }
    }
  }
}

const weedAcrossTypes = nTypeResults => {
  /* pairwise weed the typeSet of an nType with
   * the projection of of the typeSet of a lower nType
   */

  const { up } = corpus

  const theseSets = Object.entries(nTypeResults)
  if (theseSets.length == 0) {
    return
  }
  let prevIntersection = null
  for (const { intersection } of theseSets) {
    if (prevIntersection == null) {
      prevIntersection = intersection
      continue
    }
    // project
    const projection = new Set()
    for (const n in intersection) {
      if (up.has(n)) {
        const upN = up.get(n)
        if (prevIntersection.has(upN)) {
          projection.add(upN)
        }
        else {
          intersection.delete(n)
        }
      }
      else {
        intersection.delete(n)
      }
    }
    for (const upN in prevIntersection) {
      if (!(projection.has(upN))) {
        prevIntersection.delete(upN)
      }
    }
  }
}

const weedResults = nTypeResults => {
  for (const { nodeSets, intersection } of nTypeResults) {
    weedByNType(nodeSets, intersection)
  }
  weedAcrossTypes(nTypeResults)
}

const composeResults = results => {
  /* Collect result nodes into containers of type ??? (from interface)
   * Take care that the nodes are canonically sorted in the result containers
   * and that the result containers themselves are sorted.
   * Also compose a map from nodes to character positions
   */
}

const displayResults = results => {
  /*
   * Display result tuples
   * Use the map from nodes to character positions to retrieve the matched portion
   * of the source string for that node.
   */

  console.log(results)
}

const feedBack = (box, ebox, msg) => {
  console.log({ ebox, msg })
  box.addClass('error')
  ebox.html(msg)
}

const goAction = () => {
  const button = $(`#go`)
  button.off('click').click(e => {
    e.preventDefault()
    const nTypeResults = gatherResults()
    weedResults(nTypeResults)
    const results = composeResults(results)
    displayResults(results)
  })
}

const addWidgets = () => {
  const where = $('#search')
  const { ntypes, layers } = corpus
  const html = []

  for (const nType of ntypes) {
    const typeInfo = layers[nType]
    if (typeInfo) {
      html.push(genTypeWidgets(nType, typeInfo))
    }
  }
  html.push(`<button id="go">go</button>`)
  where.html(html.join(''))

  goAction()
}

const genTypeWidgets = (nType, typeInfo) => {
  const html = []

  html.push(`
<div class="ntype">
    <p class="ntype-heading">${nType}-layers</p>
`)
  for (const [name, info] of Object.entries(typeInfo)) {
    html.push(genWidget(nType, name, info))
  }
  html.push(`
</div>
`)
  return html.join('')
}

const genWidget = (nType, name, info) => `
<div class="layer" id="search_${nType}_${name}">
  <input class="pattern" type="text" maxlength="${MaxReLength}">
  <span class="error"></span>
  ${genLegend(nType, name, info)}
</div>
`

/* main
 *
 */

$(() => {
  dressUp()
  warmUp()
  addWidgets()
})
