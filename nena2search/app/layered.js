/*eslint-env jquery*/

/* global corpus */

const NUMBER = 'number'
const DEBUG = true

const tell = msg => {
  if (DEBUG) {
    console.log(msg)
  }
}

const showError = (box, ebox, msg) => {
  console.error(msg)
  box.addClass('error')
  ebox.html(msg)
}

const clearProgress = pbox => {
  pbox.html('')
}

const MaxReLength = 1000

const dressUp = () => {
  const {
    captions: { title },
  } = corpus
  $('head>title').html(title)
  $('#title').html(title)
}

const decompress = () => {
  const { up } = corpus
  const newUp = new Map()
  const down = new Map()

  for (const line of up) {
    const [spec, uStr] = line.split('\t')
    const u = uStr >> 0
    if (!down.has(u)) {
      down.set(u, new Set())
    }

    const ns = []
    const ranges = spec.split(',')

    for (const range of ranges) {
      const bounds = range.split('-').map(x => x >> 0)
      if (bounds.length == 1) {
        ns.push(bounds[0])
      } else {
        for (let i = bounds[0]; i <= bounds[1]; i++) {
          ns.push(i)
        }
      }
    }
    const downs = down.get(u)
    for (const n of ns) {
      newUp.set(n, u)
      downs.add(n)
    }
  }
  corpus.up = newUp
  corpus.down = down
}

const invertPositionMaps = () => {
  const { positions } = corpus

  const iPositions = {}

  for (const [nType, typeInfo] of Object.entries(positions)) {
    for (const [layer, pos] of Object.entries(typeInfo)) {
      const iPos = new Map()
      for (let i = 0; i < pos.length; i++) {
        const node = pos[i]
        if (node == null) {
          continue
        }
        if (!iPos.has(node)) {
          iPos.set(node, [])
        }
        iPos.get(node).push(i)
      }
      if (iPositions[nType] == null) {
        iPositions[nType] = {}
      }
      iPositions[nType][layer] = iPos
    }
  }
  corpus.iPositions = iPositions
}

const warmUpData = () => {
  const { ntypes } = corpus
  corpus.ntypesR = [...ntypes]
  corpus.ntypesR.reverse()
  const ntypesI = new Map()
  for (let i = 0; i < ntypes.length; i++) {
    ntypesI.set(ntypes[i], i)
  }
  corpus.ntypesI = ntypesI

  tell(`Decompress up-relation and infer down-relation`)
  decompress()
  tell(`Infer inverted position maps`)
  invertPositionMaps()
  tell(`Done`)
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
    const matchesByLayer = {}

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
      matchesByLayer[layer] = posFromNode
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
    const matches = matchesByLayer || null
    resultsByType[nType] = { matches, nodes: intersection }
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
    } else {
      dest.push([d, getDescendants(d, dTypeIndex, typeMap)])
    }
  }
  return dest
}

const getDisplaySettings = () => {
  // collect delivery settings from the interface

  const showLayersList = getChecked('show').map(x => x.split('-'))
  const showLayers = new Map()
  for (const [nType, layer] of showLayersList) {
    if (!showLayers.has(nType)) {
      showLayers.set(nType, [])
    }
    showLayers.get(nType).push(layer)
  }

  let containerType = getRadio('by')
  if (!containerType) {
    containerType = defaultByType()
  }
  return { showLayers, containerType }
}

const compose = (resultsByType, containerType) => {
  const { up, utypeOf, ntypesI } = corpus

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

    const descendants = getDescendants(cn, ntypesI.get(containerType), typeMap)

    results.push({ cn, ancestors, descendants })
  }
  return { results, typeMap }
}

const displayResults = resultsByType => {
  const { layers, texts, iPositions, ntypesI } = corpus
  const { showLayers, containerType } = getDisplaySettings()
  const { results, typeMap } = compose(
    resultsByType,
    containerType
  )

  tell({ showLayers, results, resultsByType, typeMap })

  const getValueHtml = (nType, layer, node) => {
    const { [nType]: { [layer]: { pos: posKey } } } = layers
    const {
      [nType]: { [layer]: text },
    } = texts
    const {
      [nType]: { [posKey]: iPos },
    } = iPositions
    const myPositions = iPos.get(node)
    const { [nType]: { matches: { [layer]: matches } = {} } = {} } = resultsByType
    const myMatches =
      matches == null || !matches.has(node) ? new Set() : matches.get(node)

    const spans = []
    let curHl = null
    for (const i of myPositions) {
      const hl = myMatches.has(i)
      if (curHl == null || curHl != hl) {
        const newSpan = [hl, text[i]]
        spans.push(newSpan)
        curHl = hl
      }
      else {
        spans[spans.length - 1][1] += text[i]
      }
    }

    const html = []
    if (spans.length > 1) {
      html.push(`<span>`)
    }
    for (const [hl, val] of spans) {
      const hlRep = hl ? ` class="hl"` : ""
      html.push(`<span${hlRep}>${val}</span>`)
    }
    if (spans.length > 1) {
      html.push(`</span>`)
    }
    return html.join("")
  }

  const genNodeHtml = node => {
    const [n, children] = typeof node === NUMBER ? [node, []] : node
    const nType = typeMap.get(n)
    const { [nType]: { nodes } } = resultsByType

    const theLayers = showLayers.has(nType) ? showLayers.get(nType) : []
    const nLayers = theLayers.length
    const hasLayers = nLayers > 0
    const hasSingleLayer = nLayers == 1
    const hasChildren = children.length > 0

    const hlClass = (ntypesI.get(nType) == 0) ? "" : nodes.has(n) ? " hlh" : "o"

    const hlRep = (hlClass == "") ? "" : ` class="${hlClass}"`
    const lrRep = hasSingleLayer ? "" : ` m`
    const hdRep = hasChildren ? "h" : ""

    const html = []
    html.push(`<span${hlRep}>`)

    if (hasLayers) {
      html.push(`<span class="${hdRep}${lrRep}">`)
      for (const layer of theLayers) {
        html.push(`${getValueHtml(nType, layer, n)}`)
      }
      html.push(`</span>`)
    }

    if (hasChildren) {
      html.push(`<span>`)
      for (const ch of children) {
        html.push(genNodeHtml(ch))
      }
      html.push(`</span>`)
    }

    html.push(`</span>`)

    return html.join('')
  }

  const genAncestorsHtml = ancestors => {
    const html = ancestors.map(anc => genNodeHtml(anc))
    return html.join(' ')
  }

  const genResHtml = (cn, descendants) => {
    const html = []
    html.push(`${genNodeHtml(cn)} `)
    for (const desc of descendants) {
      html.push(genNodeHtml(desc))
    }
    return html.join('')
  }

  const genResultHtml = (i, result) => {
    const { ancestors, cn, descendants } = result
    const ancRep = genAncestorsHtml(ancestors)
    const resRep = genResHtml(cn, descendants)

    return `
  <tr>
  <th>${i}</th>
  <td>${ancRep}</td>
  <td>${resRep}</td>
  </tr>
  `
  }

  const genResultsHtml = results => {
    const html = []
    html.push(`
  <table>
    <thead>
      <th>n</th>
      <th>in</th>
      <th>result</th>
    </thead>
    <tbody>
  `)
    for (let i = 0; i < results.length; i++) {
      html.push(genResultHtml(i, results[i]))
    }
    html.push(`
    </tbody>
  </table>
  `)
    return html.join('')
  }

  const html = genResultsHtml(results)
  const where = $('#rlst')
  where.html(html)
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

  const value = DEBUG ? info['value'] || '' : ''
  return `
<tr>
  <td></td>
  <td><input type="checkbox" name="show" value="${nType}-${layer}" ${checked}></td>
  <td>
    <input
      type="text"
      id="pattern_${nType}_${layer}"
      class="pattern"
      maxlength="${MaxReLength}"
      value="${value}"
    >
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
