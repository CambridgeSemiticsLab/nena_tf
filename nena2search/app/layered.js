/*eslint-env jquery*/

/* global corpus */

const NUMBER = 'number'
const MaxReLength = 1000

const decompress = () => {
  const { up } = corpus
  const newUp = new Map()
  const down = new Map()

  for (const [nodeSpec, upN] of up) {
    if (!down.has(upN)) {
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
  corpus.up = newUp
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
  const { ntypes } = corpus
  corpus.ntypesR = [...ntypes]
  corpus.ntypesR.reverse()
  decompress()
}

const doSearch = (nType, layer, info, regex) => {
  const {
    texts: {
      [nType]: { [layer]: text },
    },
    positions,
  } = corpus
  const { pos: posKey } = info
  const {
    [nType]: { [posKey]: pos },
  } = positions
  const searchResults = text.matchAll(regex)
  const posFromNode = new Map()
  const nodeSet = new Set()
  for (const match of searchResults) {
    const hit = match[0]
    const start = match.index
    const end = start + hit.length
    for (let i = start; i < end; i++) {
      const node = pos[i]
      if (node != null) {
        if (!posFromNode.has(node)) {
          posFromNode.set(node, new Set())
        }
        posFromNode.get(node).add(i)
        nodeSet.add(node)
      }
    }
  }
  return { posFromNode, nodeSet }
}

const gather = () => {
  const { ntypesR, layers } = corpus

  const resultsByType = {}

  for (const nType of ntypesR) {
    const { [nType]: typeInfo = {} } = layers
    let intersection = null
    const layerResults = {}

    for (const [layer, info] of Object.entries(typeInfo)) {
      const box = $(`#pattern_${nType}_${layer}`)
      const ebox = $(`#error_${nType}_${layer}`)
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
      const { posFromNode, nodeSet } = doSearch(nType, layer, info, regex)
      layerResults[layer] = posFromNode
      if (intersection == null) {
        intersection = nodeSet
      } else {
        for (const node of intersection) {
          if (!nodeSet.has(node)) {
            intersection.delete(node)
          }
        }
      }
    }
    resultsByType[nType] = { layers: layerResults || null, nodes: intersection }
  }
  return resultsByType
}

const weed = resultsByType => {
  const { up, down, ntypes } = corpus
  const stats = {}

  // determine highest and lowest types in which a search has been performed
  let hi = null
  let lo = null

  for (let i = 0; i < ntypes.length; i++) {
    const nType = ntypes[i]
    const {
      [nType]: { nodes },
    } = resultsByType

    if (nodes != null) {
      if (lo == null) {
        lo = i
      }
      hi = i
    }
  }
  // done if no search has been performed
  // also done if just one type has been searched

  if (hi == null || hi == lo) {
    return stats
  }

  /*
   * Suppose we have types 0 .. 7 with hi and lo as follows.
   *
   *  0
   *  1
   *  2=hi
   *  3
   *  4
   *  5=lo
   *  6
   *  7
   *
   *  Then we walk through the layers as follows
   *
   *  2 dn 3 dn 4 dn 5
   *  5 up 4 up 3 up 2 up 1 up 0
   *  5 dn 6 dn 7
   */

  // intersect downwards

  for (let i = hi; i > lo; i--) {
    const upType = ntypes[i]
    const dnType = ntypes[i - 1]
    const {
      [upType]: { nodes: upNodes },
      [dnType]: resultsDn = {},
    } = resultsByType
    let { nodes: dnNodes } = resultsDn
    const dnFree = dnNodes == null
    // project upnodes downward if there was no search in the down type
    if (dnFree) {
      dnNodes = new Set()
      for (const un of upNodes) {
        if (down.has(un)) {
          for (const dn of down.get(un)) {
            dnNodes.add(dn)
          }
        }
      }
      resultsDn['nodes'] = dnNodes
    }
    // if there was a search in the down type, weed out the down nodes that
    // have no upward partner in the up nodes
    for (const dn of dnNodes) {
      if (!up.has(dn) || !upNodes.has(up.get(dn))) {
        dnNodes.delete(dn)
      }
    }
  }

  // intersect upwards (all the way to the top)

  for (let i = lo; i < ntypes.length - 1; i++) {
    const dnType = ntypes[i]
    const upType = ntypes[i + 1]
    const {
      [upType]: resultsUp = {},
      [dnType]: { nodes: dnNodes },
    } = resultsByType

    const upNodes = new Set()
    for (const dn of dnNodes) {
      if (up.has(dn)) {
        upNodes.add(up.get(dn))
      }
    }
    resultsUp['nodes'] = upNodes
  }

  // project downwards from the lowest level to the bottom type

  for (let i = lo; i > 0; i--) {
    const upType = ntypes[i]
    const dnType = ntypes[i - 1]
    const {
      [upType]: { nodes: upNodes },
      [dnType]: resultsDn = {},
    } = resultsByType
    const dnNodes = new Set()
    for (const un of upNodes) {
      if (down.has(un)) {
        for (const dn of down.get(un)) {
          dnNodes.add(dn)
        }
      }
    }
    resultsDn['nodes'] = dnNodes
  }

  // collect statistics
  //
  for (const [nType, { nodes }] of Object.entries(resultsByType)) {
    stats[nType] = nodes.size
  }
  return stats
}

const getDescendants = (u, uTypeIndex, typeMap) => {
  if (uTypeIndex == 0) {
    return
  }

  const { down, dtypeOf, ntypes } = corpus

  const uType = ntypes[uTypeIndex]
  const dType = dtypeOf[uType]
  const dTypeIndex = uTypeIndex - 1

  const dest = []

  for (const d of down.get(u)) {
    typeMap.set(d, dType)
    if (dTypeIndex == 0) {
      dest.push(d)
    }
    else {
      dest.push([d, getDescendants(d, dTypeIndex, typeMap)])
    }
  }
  return dest
}

const displayResults = resultsByType => {
  /*
   * Display result tuples
   * Use the map from nodes to character positions to retrieve the matched portion
   * of the source string for that node.
   */

  const { up, utypeOf, ntypes } = corpus

  // collect delivery settings from the interface

  const showLayers = getChecked('show')

  let containerType = getRadio('by')
  if (!containerType) {
    containerType = defaultByType()
  }
  let containerIndex
  for (let i = 0; i < ntypes.length; i++) {
    if (ntypes[i] == containerType) {
      containerIndex = i
    }
  }

  const {
    [containerType]: { nodes: containerNodes },
  } = resultsByType

  const results = []
  const typeMap = new Map()

  for (const cn of containerNodes) {
    // collect the upnodes

    typeMap.set(cn, containerType)

    let un = cn
    let uType = containerType

    const ancestors = []

    while (up.has(un)) {
      un = up.get(un)
      uType = utypeOf[uType]
      typeMap.set(un, uType)
      ancestors.unshift(un)
    }

    // collect the down nodes

    const descendants = getDescendants(cn, containerIndex, typeMap)

    results.push({ cn, ancestors, descendants })
  }

  console.log({ showLayers, containerType, containerNodes, results, typeMap })
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

const showStats = stats => {
  const { ntypesR } = corpus
  const where = $('#stats')
  const html = []
  html.push(`
<table>
<colgroup>
  <col align="left">
  <col align="right">
</colgroup>
<thead>
  <tr>
    <th><i>level</i></th>
    <th>results</th>
  </tr>
</thead>
<tbody>
`)
  for (const nType of ntypesR) {
    const stat = stats[nType]
    if (stat == null) {
      continue
    }
    html.push(`
  <tr>
    <td><i>${nType}</i></td>
    <td><b><code>\u00A0${stat}</code></b></td>
  </tr>
`)
  }
  html.push(`
</tbody>
</table>
`)
  where.html(html.join(''))
}

const goAction = () => {
  const button = $(`#go`)
  button.off('click').click(e => {
    e.preventDefault()
    const resultsByType = gather()
    const stats = weed(resultsByType)
    showStats(stats)
    displayResults(resultsByType)
  })
}

const defaultByType = () => {
  const { ntypes } = corpus
  const pos = Math.round(ntypes.length / 2)
  return ntypes[pos]
}

const addWidgets = () => {
  const where = $('#search')
  const { ntypesR, layers } = corpus
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

  for (const nType of ntypesR) {
    const typeInfo = layers[nType] || {}
    html.push(genTypeWidgets(nType, typeInfo))
  }
  html.push(`
</tbody>
</table>
`)
  html.push(`
<button id="go">go</button>
<div class="stats" id="stats"></div>
`)
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

  for (const [layer, info] of Object.entries(typeInfo)) {
    html.push(genWidget(nType, layer, info))
  }
  return html.join('')
}

const getRadio = name => $(`input[name="${name}"]:checked`).val()

const getChecked = name =>
  $(`input[name="${name}"]:checked`)
    .map((i, elem) => elem.value)
    .get()

const genWidget = (nType, layer, info) => {
  const {
    show: { [nType]: { [layer]: theShow } = {} },
  } = corpus
  const checked = theShow ? ' checked' : ''
  return `
<tr>
  <td></td>
  <td><input type="checkbox" name="show" value="${nType}-${layer}" ${checked}></td>
  <td>
    <input type="text" id="pattern_${nType}_${layer}" class="pattern" maxlength="${MaxReLength}">
    <span id="error_${nType}_${layer}" class="error"></span>
  </td>
  <td>${genLegend(nType, layer, info)}</td>
</tr>
`
}

const genLegend = (nType, layer, info) => {
  const { map } = info
  const html = []

  if (map) {
    html.push(`
<details>
  <summary class="lyr">${layer}</summary>
`)
    for (const [acro, full] of Object.entries(map)) {
      html.push(`<div class="legend"><b>${acro}</b> = ${full}</div>`)
    }
    html.push(`
</details>
`)
  } else {
    html.push(`
<span class="lyr">${layer}</span>
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
