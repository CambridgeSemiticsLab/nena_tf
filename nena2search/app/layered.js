/*eslint-env jquery*/

/* global corpus */

const NUMBER = 'number'
const MaxReLength = 1000

const decompress = () => {
  const { up } = corpus
  const newUp = new Map()
  const down = new Map()

  for (const [nodeSpec, upN] of up) {
    if (!(down.has(upN))) {
      down.set(upN, new Set())
    }
    const downs = down.get(upN)
    if (typeof nodeSpec === NUMBER) {
      newUp[nodeSpec] = upN
      downs.add(nodeSpec)
    } else {
      for (const nodeRange of nodeSpec) {
        if (typeof nodeRange === NUMBER) {
          newUp.set(nodeRange, upN)
          downs.add(nodeRange)
        } else {
          for (let n = nodeRange[0]; n <= nodeRange[1]; n++) {
            newUp.set(n, upN)
            downs.add(n)
          }
        }
      }
    }
  }
  corpus.down = down
}

const dressUp = () => {
  const {
    captions: { title },
  } = corpus
  $('head>title').html(title)
  $('#title').html(title)
}

const warmUpData = () => {
  progress(`Decompress up-relation and infer down-relation`)
  decompress()
}

const doSearch = (nType, name, info, regex) => {
  const { texts: { [nType]: { [name]: text } }, positions } = corpus
  const { pos: posKey } = info
  const { [nType]: { [posKey]: pos } } = positions
  const searchResults = text.matchAll(regex)
  const resultMap = new Map()
  const nodeSet = new Set()
  for (const match of searchResults) {
    const hit = match[0]
    const start = match.index
    const end = start + hit.length
    for (let i = start; i < end; i++) {
      const node = pos[i]
      if (node != null) {
        resultMap.set(i, node)
        nodeSet.add(node)
      }
    }
  }
  return { resultMap, nodeSet }
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
    // gather results for all layers having nType

    for (const [name, info] of Object.entries(typeInfo)) {
      const box = $(`#pattern_${nType}_${name}`)
      const ebox = $(`#error_${nType}_${name}`)
      ebox.val('')
      box.removeClass('error')
      const pattern = box.val()
      if (pattern == null || pattern == '') {
        continue
      }
      if (pattern.length > MaxReLength) {
        showError(box, ebox, `pattern must be less than ${MaxReLength} characters long`)
        continue
      }
      let regex
      try {
        regex = new RegExp(pattern, 'g')
      } catch (error) {
        showError(box, ebox, `'${pattern}': ${error}`)
        continue
      }
      if (nTypeResults[nType] == null || nTypeResults[nType]["layers"] == null) {
        nTypeResults[nType] = { layers: {} }
      }
      nTypeResults[nType]['layers'][name] = doSearch(nType, name, info, regex)
    }
  }
  return nTypeResults
}

const weedByNType = nTypeResults => {
  // take the intersection of all nodeSets (all with the same nType)

  const intersection = new Set()

  for (const [ nType, { layers }] of Object.entries(nTypeResults)) {
    const theseSets = Object.values(layers).map(({ nodeSet }) => nodeSet)

    if (theseSets.length == 0) {
      continue
    }
    const firstSet = theseSets[0]
    for (const n of firstSet) {
      intersection.add(n)
    }
    nTypeResults[nType]["intersection"] = intersection

    if (theseSets.length == 1) {
      continue
    }
    for (const thisSet of theseSets.slice(1)) {
      for (const n of intersection) {
        if (!thisSet.has(n)) {
          intersection.delete(n)
        }
      }
    }
  }
}

const weedAcrossTypes = nTypeResults => {
  /* fill unsearched layers with projections of neighbouring layers
   * from top to bottom: perform pairwise intersections
   * repeat taking pairwise intersections until the intersections do not change anymore
   */

  const nDiffTypes = Object.keys(nTypeResults).length
  if (nDiffTypes.length <= 1) {
    return
  }

  const { up, ntypes } = corpus

  /* We start from the highest level and go downwards
   * First we find the first level where we have searched
   */

  let firstType = null

  for (const nType of ntypes) {
    const { [nType]: { intersection } = {} } = nTypeResults

    if (intersection != null) {
      firstType = nType
      break
    }
  }

  // we may not have searched, then there is nothing to do

  if (firstType == null) {
    return
  }

  /* Work from this level upward, and put in the intersection

  let prevIntersection = null

    const projection = new Set()
    for (const n in intersection) {
      if (up.has(n)) {
        const upN = up.get(n)
        if (prevIntersection.has(upN)) {
          projection.add(upN)
        } else {
          intersection.delete(n)
        }
      } else {
        intersection.delete(n)
      }
    }
    for (const upN in prevIntersection) {
      if (!projection.has(upN)) {
        prevIntersection.delete(upN)
      }
    }
  }
}

const weedResults = nTypeResults => {
  weedByNType(nTypeResults)
  weedAcrossTypes(nTypeResults)
}

const composeResults = nTypeResults => {
  /* Collect result nodes into containers of type ??? (from interface)
   * Take care that the nodes are canonically sorted in the result containers
   * and that the result containers themselves are sorted.
   * Also compose a map from nodes to character positions
   */

  let containerType = getRadio('by')
  if (!containerType) {
    containerType = defaultByType()
  }
  const showLayers = getChecked('show')
  console.log({ containerType, showLayers })

  const results = nTypeResults
  return results
}

const displayResults = results => {
  /*
   * Display result tuples
   * Use the map from nodes to character positions to retrieve the matched portion
   * of the source string for that node.
   */

  console.log(`displayResults ${results.length}`)
}

const showError = (box, ebox, msg) => {
  console.error(msg)
  box.addClass('error')
  ebox.html(msg)
}

const progress = msg => {
  console.log(msg)
}

const clearProgress = pbox => {
  pbox.html('')
}

const goAction = () => {
  const button = $(`#go`)
  button.off('click').click(e => {
    e.preventDefault()
    const nTypeResults = gatherResults()
    weedResults(nTypeResults)
    const results = composeResults(nTypeResults)
    displayResults(results)
  })
}

const defaultByType = () => {
  const { ntypes } = corpus
  const pos = Math.round((ntypes.length + 1) / 2)
  return ntypes[pos]
}

const addWidgets = () => {
  const where = $('#search')
  const { ntypes, layers } = corpus
  const html = []
  html.push(`
<table>
<thead>
<tr>
  <th>by</th>
  <th>show</th>
  <th>level/pattern</th>
  <th>layer</th>
</tr>
</thead>
<tbody>
`)

  for (const nType of ntypes) {
    const typeInfo = layers[nType] || {}
    html.push(genTypeWidgets(nType, typeInfo))
  }
  html.push(`
</tbody>
</table>
`)
  html.push(`<button id="go">go</button>`)
  where.html(html.join(''))

  goAction()
}

const genTypeWidgets = (nType, typeInfo) => {
  const {
    by: { [nType]: theBy },
  } = corpus
  const checked = theBy ? ' checked' : ''

  const html = []
  html.push(`
<tr>
  <td><input type="radio" name="by" value="${nType}" ${checked}></td>
  <td></td>
  <td class="lvcell"><span class="lv">${nType}</span></td>
  <td></td>
</tr>
`)

  for (const [name, info] of Object.entries(typeInfo)) {
    html.push(genWidget(nType, name, info))
  }
  return html.join('')
}

const getRadio = name => $(`input[name="${name}"]:checked`).val()

const getChecked = name =>
  $(`input[name="${name}"]:checked`).map((i, elem) => elem.value).get()

const genWidget = (nType, name, info) => {
  const {
    show: { [nType]: { [name]: theShow } = {} },
  } = corpus
  const checked = theShow ? ' checked' : ''
  return `
<tr>
  <td></td>
  <td><input type="checkbox" name="show" value="${nType}-${name}" ${checked}></td>
  <td>
    <input type="text" id="pattern_${nType}_${name}" class="pattern" maxlength="${MaxReLength}">
    <span id="error_${nType}_${name}" class="error"></span>
  </td>
  <td>${genLegend(nType, name, info)}</td>
</tr>
`
}

const genLegend = (nType, name, info) => {
  const { map } = info
  const html = []

  if (map) {
    html.push(`
<details>
  <summary class="lyr">${name}</summary>
`)
    for (const [acro, full] of Object.entries(map)) {
      html.push(`<div class="legend"><b>${acro}</b> = ${full}</div>`)
    }
    html.push(`
</details>
`)
  } else {
    html.push(`
<span class="lyr">${name}</span>
`)
  }
  return html.join('')
}

/* main
 *
 */

$(() => {
  const pbox = $('#progress')
  dressUp()
  warmUpData()
  addWidgets()
  clearProgress(pbox)
})
