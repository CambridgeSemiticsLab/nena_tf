/*eslint-env jquery*/

/* global corpus */

/* READONLY DATA */

const NUMBER = 'number'
const DEBUG = true
const WINDOW = 20
const MaxReLength = 1000
const { simpleBase } = corpus

/* INFORMATIONAL MESSAGES */

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

const clearError = (box, ebox) => {
  box.removeClass('error')
  ebox.html('')
}

const showProgress = (box, msg) => {
  box.append(`${msg}<br>`)
}

const clearProgress = pbox => {
  pbox.html('')
}

/* RESULTS DATA */

let resultsByType = null
let resultsComposed = null
let resultTypeMap = null
let focusPos = 0

const resetResults = () => {
  resultsByType = null
  resultsComposed = null
  resultTypeMap = null
  focusPos = 0
}

/* INTERFACE DATA */

let jobName

/* HANDLING CORPUS DATA */

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

/* SETTING UP DYNAMIC PARTS OF THE HTML */

const dressUp = () => {
  const {
    description,
    captions: { title },
  } = corpus
  $('head>title').html(title)
  $('#title').html(title)
  $('#description').html(description)
}

/* SEARCH EXECUTION */

const doSearch = (nType, layer, info, regex) => {
  /* perform regular expression search for a single layer
   * return character positions and nodes that hold those positions
   */
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
  /* perform regular expression search for all layers
   * return for each node type
   *     the intersection of the nodesets found for each layer
   *     for each layer, a mapping of nodes to matched positions
   */
  const { ntypesR, layers } = corpus

  resultsByType = {}

  for (const nType of ntypesR) {
    const { [nType]: typeInfo = {} } = layers
    let intersection = null
    const matchesByLayer = {}

    for (const [layer, info] of Object.entries(typeInfo)) {
      const box = $(`#pattern_${nType}_${layer}`)
      const ebox = $(`#error_${nType}_${layer}`)
      clearError(box, ebox)
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
}

const weed = () => {
  /* combine the search results across node types
   * the current search results will be weeded in place:
   *   the nodesets found per node type will be projected onto other types
   *   and then the intersection with those projected sets will be taken.
   *   This leads to the situation where for each node type there is a nodeset
   *   that maps 1-1 to the nodeset of any other type module projection.
   *  returns statistics: how many nodes there are for each type.
   */
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

  if (hi == null) {
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

const showStats = stats => {
  /* show statistics found by weed() on the interface
  */
  const { ntypesR } = corpus
  const where = $('#statsbody')
  const html = []
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
  where.html(html.join(''))
}

const defaultByType = () => {
  /* If no default container type has been given,
   * define one: take a type in the middle of all node types
   */
  const { ntypes } = corpus
  const pos = Math.round(ntypes.length / 2)
  return ntypes[pos]
}

const getDescendants = (u, uTypeIndex) => {
  /* get all descendents of a node, organized by node type
   * This is an auxiliary function for compose()
   * The function calls itself recursively for all the children of
   * the node in a lower level
   * returns an array of subarrays, where each subarray corresponds to a child node
   * and has the form [node, [...descendants of node]]
   */
  if (uTypeIndex == 0) {
    return []
  }

  const { down, dtypeOf, ntypes } = corpus

  const uType = ntypes[uTypeIndex]
  const dType = dtypeOf[uType]
  const dTypeIndex = uTypeIndex - 1

  const dest = []

  for (const d of down.get(u)) {
    resultTypeMap.set(d, dType)
    if (dTypeIndex == 0) {
      dest.push(d)
    } else {
      dest.push([d, getDescendants(d, dTypeIndex, resultTypeMap)])
    }
  }
  return dest
}

const getRadio = name => $(`input[name="${name}"]:checked`).val()

const getChecked = name =>
  $(`input[name="${name}"]:checked`)
    .map((i, elem) => elem.value)
    .get()

const setBox = (name, value, state) =>
  $(`input[name="${name}"][value="${value}"]`).prop('checked', state)

const getDisplaySettings = () => {
  /* collects the result-display settings from the interface
   * The containerType is used to compose results into chunks
   * The show settings are used to determine for which layers results
   * must be rendered
   */
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

const compose = () => {
  /* divided search results into chunks by containerType
   * The results are organized by the result nodes that have containerType as node type.
   * Each result will have three parts:
   *   ancestor nodes: result nodes of higher types that contain the container node
   *   container node: one node of the containerType
   *   descendant nodes: all descendants of the container node
   * The result at the position that has currently focus on the interface,
   * is marked by means of a class
   * If we do a new compose because the user has changed the container type,
   * we estimate the focus position in the new container type based on the
   * focus poition in the old container type
   * We adjust the interface to the new focus pos (slider and number controls)
   */
  const { ntypesI, up, utypeOf } = corpus
  const { containerType } = getDisplaySettings()

  const {
    [containerType]: { nodes: containerNodes },
  } = resultsByType

  const prevNResults = resultsComposed == null ? 1 : resultsComposed.length
  const prevNResultsP = Math.max(prevNResults, 1)
  const prevFocusPos = focusPos
  const prevRelative = prevFocusPos / prevNResultsP

  resultsComposed = []
  resultTypeMap = new Map()

  for (const cn of containerNodes) {
    // collect the upnodes

    resultTypeMap.set(cn, containerType)

    let un = cn
    let uType = containerType

    const ancestors = []

    while (up.has(un)) {
      un = up.get(un)
      uType = utypeOf[uType]
      resultTypeMap.set(un, uType)
      ancestors.unshift(un)
    }

    // collect the down nodes

    const descendants = getDescendants(cn, ntypesI.get(containerType))

    resultsComposed.push({ cn, ancestors, descendants })
  }
  const slider = $('#slider')
  const setter = $('#setter')
  const total = $('#total')

  const nResults = resultsComposed.length
  const nResultsP = Math.max(nResults, 1)
  const stepSize = Math.max(Math.round(nResults / 100), 1)
  focusPos = Math.min(nResults, Math.round(nResults * prevRelative))

  setter.attr('max', nResultsP)
  setter.attr('step', stepSize)
  slider.attr('max', nResultsP)
  slider.attr('step', stepSize)
  setter.val(focusPos)
  slider.val(focusPos)
  total.html(nResults)
}

const getHLText = (iPositions, matches, text) => {
  /* get highlighted text for a node
   * The results of matching a pattern against a text are highlighted within that text
   * returns a sequence of spans, where each span is an array of postions plus a boolean
   * that indicated whether the span is highlighted or not.
   * Used by display() and tabular() below
   */
  const spans = []
  let curHl = null
  for (const i of iPositions) {
    const hl = matches.has(i)
    if (curHl == null || curHl != hl) {
      const newSpan = [hl, text[i]]
      spans.push(newSpan)
      curHl = hl
    } else {
      spans[spans.length - 1][1] += text[i]
    }
  }
  return spans
}

const display = () => {
  /* Displays composed results on the interface.
   * Results are displayed in a table, around a focus position
   * We only display a limited amount of results around the focus position,
   * but the user can move the focus position in various ways.
   * Per result we show this:
   *   Ancestor nodes are rendered highlighted
   *   The container nodes themselves are rendered as single nodes
   *     if they have content, otherwise they are left out
   *   The descendants of the container node are rendered with all of descendants (recursively),
   *     where the descendants that have results are highlighted.
   */
  const { layers, texts, iPositions, ntypesI } = corpus
  const { showLayers } = getDisplaySettings()

  const genValueHtml = (nType, layer, node) => {
    /* generates the html for a layer of node, including the result highlighting
     */
    const {
      [nType]: {
        [layer]: { pos: posKey },
      },
    } = layers
    const {
      [nType]: { [layer]: text },
    } = texts
    const {
      [nType]: { [posKey]: iPos },
    } = iPositions
    const nodeIPositions = iPos.get(node)
    const { [nType]: { matches: { [layer]: matches } = {} } = {} } = resultsByType
    const nodeMatches =
      matches == null || !matches.has(node) ? new Set() : matches.get(node)

    const spans = getHLText(nodeIPositions, nodeMatches, text)

    const html = []
    if (spans.length > 1) {
      html.push(`<span>`)
    }
    for (const [hl, val] of spans) {
      const hlRep = hl ? ` class="hl"` : ''
      html.push(`<span${hlRep}>${val}</span>`)
    }
    if (spans.length > 1) {
      html.push(`</span>`)
    }
    return html.join('')
  }

  const genNodeHtml = node => {
    /* generates the html for a node, including all layers and highlighting
     */
    const [n, children] = typeof node === NUMBER ? [node, []] : node
    const nType = resultTypeMap.get(n)
    const {
      [nType]: { nodes },
    } = resultsByType

    const theLayers = showLayers.has(nType) ? showLayers.get(nType) : []
    const nLayers = theLayers.length
    const hasLayers = nLayers > 0
    const hasSingleLayer = nLayers == 1
    const hasChildren = children.length > 0
    if (!hasLayers && !hasChildren) {
      return ''
    }

    const hlClass =
      simpleBase && ntypesI.get(nType) == 0 ? '' : nodes.has(n) ? ' hlh' : 'o'

    const hlRep = hlClass == '' ? '' : ` class="${hlClass}"`
    const lrRep = hasSingleLayer ? '' : ` m`
    const hdRep = hasChildren ? 'h' : ''

    const html = []
    html.push(`<span${hlRep}>`)

    if (hasLayers) {
      html.push(`<span class="${hdRep}${lrRep}">`)
      for (const layer of theLayers) {
        html.push(`${genValueHtml(nType, layer, n)}`)
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
    /* generates the html for the ancestor nodes of a result
     */
    const html = ancestors.map(anc => genNodeHtml(anc))
    return html.join(' ')
  }

  const genResHtml = (cn, descendants) => {
    /* generates the html for the container node and descendant nodes of a result
     */
    const html = []
    html.push(`${genNodeHtml(cn)} `)
    for (const desc of descendants) {
      html.push(genNodeHtml(desc))
    }
    return html.join('')
  }

  const genResultHtml = (i, result, isFocus) => {
    /* generates the html for a single result
     */
    const { ancestors, cn, descendants } = result
    const ancRep = genAncestorsHtml(ancestors)
    const resRep = genResHtml(cn, descendants)
    const focusCls = isFocus ? ` class="focus"` : ''

    return `
<tr${focusCls}>
  <th>${i}</th>
  <td>${ancRep}</td>
  <td>${resRep}</td>
</tr>
  `
  }

  const genResultsHtml = () => {
    /* generates the html for all relevant results around a focus position in the
     * table of results
     */
    const startPos = Math.max(focusPos - WINDOW, 0)
    const endPos = Math.min(startPos + 2 * WINDOW + 1, resultsComposed.length - 1)
    const html = []
    for (let i = startPos; i <= endPos; i++) {
      html.push(genResultHtml(i, resultsComposed[i], i == focusPos))
    }
    return html.join('')
  }

  const html = genResultsHtml()
  const where = $('#resultsbody')
  where.html(html)
  gotoFocus()
}

const gotoFocus = () => {
  /* scrolls the interface to the result that is in focus
  */
  const rTarget = $(`.focus`)
  if (rTarget != null && rTarget[0] != null) {
    rTarget[0].scrollIntoView({ block: 'center' })
  }
}

/* RESULTS EXPORT
 * Exports the current results to a tsv file
 * All result nodes will be exported in a table
 * with one node per row:
 * the first column is the node number, the second one is the node type
 * and the layers are the remaining columns
 *
 * N.B. So we do not export composed results, but raw result nodes.
 *
 * The resulting tsv is written in UTF-16-LE encoding for optimal interoperability
 * with Excel
 */
const tabular = () => {
  if (resultsByType == null) {
    return null
  }
  const { layers, texts, iPositions, ntypes } = corpus
  const { showLayers } = getDisplaySettings()

  const headFields = ['type']
  const nodeFields = new Map()

  for (let i = 0; i < ntypes.length; i++) {
    const nType = ntypes[i]
    const {
      [nType]: { matches, nodes },
    } = resultsByType

    if (nodes == null) {
      continue
    }

    const { [nType]: tpLayerInfo } = layers
    const { [nType]: tpTexts } = texts
    const { [nType]: tpIPositions } = iPositions

    const exportLayers = showLayers.has(nType) ? showLayers.get(nType) : []

    for (const layer of exportLayers) {
      const tpLayer = `${nType}-${layer}`
      headFields.push(tpLayer)

      const {
        [layer]: { pos: posKey },
      } = tpLayerInfo
      const { [layer]: text } = tpTexts
      const { [posKey]: iPos } = tpIPositions
      const { [layer]: lrMatches } = matches

      for (const node of nodes) {
        if (!nodeFields.has(node)) {
          nodeFields.set(node, new Map())
        }
        const fields = nodeFields.get(node)
        fields.set('type', nType)

        const nodeIPositions = iPos.get(node)
        const nodeMatches =
          lrMatches == null || !lrMatches.has(node) ? new Set() : lrMatches.get(node)
        const spans = getHLText(nodeIPositions, nodeMatches, text)

        let piece = ''
        for (const [hl, val] of spans) {
          piece += `${hl ? '«' : ''}${val}${hl ? '»' : ''}`
        }
        fields.set(tpLayer, piece)
      }
    }
  }

  const headLine = `node\t${headFields.join('\t')}\n`
  const lines = [headLine]

  for (let i = 0; i < ntypes.length; i++) {
    const nType = ntypes[i]
    const {
      [nType]: { nodes },
    } = resultsByType
    if (nodes == null) {
      continue
    }

    const sortedNodes = [...nodes].sort()

    for (const node of sortedNodes) {
      const thisLine = [`${node}`]
      const fields = nodeFields.has(node) ? nodeFields.get(node) : new Map()

      for (const headField of headFields) {
        thisLine.push(fields.has(headField) ? fields.get(headField) : '')
      }
      lines.push(`${thisLine.join('\t')}\n`)
    }
  }

  return lines
}

/* GENERATE SEARCH INTERFACE
 * The user interface for the search patterns is generated
 */
const activateSearch = () => {
  /* make the search button active
  */
  const button = $(`#go`)
  button.off('click').click(e => {
    e.preventDefault()
    cancelJobAction()
    memorizeThisJob()
    gather()
    const stats = weed()
    showStats(stats)
    compose()
    display()
  })
}

const activateBy = () => {
  /* make the "by" radio buttons active
  */
  $(`input[name="by"]`)
    .off('click')
    .click(() => {
      memorizeThisJob()
      if (resultsByType != null) {
        compose()
        display()
      }
    })
}

const activateShow = () => {
  /* make the "show" checkboxes active
  */
  $(`input[name="show"]`)
    .off('click')
    .click(() => {
      memorizeThisJob()
      if (resultsByType != null) {
        display()
      }
    })
}

const activateNumberControl = () => {
  /* make the number controls active
   *   the result slider
   *   the input box for the focus position
   * Keep the various ways of changing the focus position synchronized
  */
  const slider = $('#slider')
  const setter = $('#setter')
  const minp = $('#minp')
  const min2p = $('#min2p')
  const maxp = $('#maxp')
  const max2p = $('#max2p')

  slider.off('change').change(() => {
    memorizeThisJob()
    focusPos = slider.val()
    setter.val(focusPos)
    display()
  })
  setter.off('change').change(() => {
    memorizeThisJob()
    focusPos = setter.val()
    slider.val(focusPos)
    display()
  })
  minp.off('click').click(() => {
    memorizeThisJob()
    focusPos = Math.max(0, focusPos - WINDOW)
    setter.val(focusPos)
    slider.val(focusPos)
    display()
  })
  min2p.off('click').click(() => {
    memorizeThisJob()
    focusPos = Math.max(0, focusPos - 2 * WINDOW)
    setter.val(focusPos)
    slider.val(focusPos)
    display()
  })
  maxp.off('click').click(() => {
    memorizeThisJob()
    focusPos = Math.min((resultsComposed || []).length - 1, focusPos + WINDOW)
    setter.val(focusPos)
    slider.val(focusPos)
    display()
  })
  max2p.off('click').click(() => {
    memorizeThisJob()
    focusPos = Math.min((resultsComposed || []).length - 1, focusPos + 2 * WINDOW)
    setter.val(focusPos)
    slider.val(focusPos)
    display()
  })
}

const addWidgets = () => {
  /* Generate all search controls
   * and put them on the interface
  */
  const where = $('#querybody')
  const { ntypesR, layers, levels } = corpus
  const html = []

  for (const nType of ntypesR) {
    const typeInfo = layers[nType] || {}
    const description = levels[nType] || {}
    html.push(genTypeWidgets(nType, description, typeInfo))
  }
  where.html(html.join(''))
}

const genTypeWidgets = (nType, description, typeInfo) => {
  /* Generate html for the search controls for a node type
  */
  const nTypeRep = description
    ? `<details><summary class="lv">${nType}</summary><div>${description}</div></details>`
    : `<span class="lv">${nType}</span>`

  const html = []
  html.push(`
<tr class="qtypefirst">
  <td><input type="radio" name="by" value="${nType}"></td>
  <td></td>
  <td class="lvcell">${nTypeRep}</td>
  <td></td>
</tr>
`)

  const theseLayers = Object.entries(typeInfo)
  let i = 0
  for (const [layer, info] of theseLayers) {
    i += 1
    html.push(genWidget(nType, layer, info, i == theseLayers.length))
  }
  return html.join('')
}

const genWidget = (nType, layer, info, isLast) => {
  /* Generate html for the search controls for a single layer
  */
  const lastCls = isLast ? ` class="qtypelast"` : ''
  return `
<tr${lastCls}>
  <td></td>
  <td><input type="checkbox" name="show" value="${nType}-${layer}"></td>
  <td>
    <input
      type="text"
      id="pattern_${nType}_${layer}"
      class="pattern"
      maxlength="${MaxReLength}"
      value=""
    >
    <span id="error_${nType}_${layer}" class="error"></span>
  </td>
  <td>${genLegend(nType, layer, info)}</td>
</tr>
`
}

const genLegend = (nType, layer, info) => {
  /* Generate html for the description / legend of a single layer
  */
  const { map, description } = info
  const html = []

  if (map || description) {
    html.push(`
<details>
  <summary class="lyr">${layer}</summary>
`)
    if (description) {
      html.push(`<div>${description}</div>`)
    }
    if (map) {
      for (const [acro, full] of Object.entries(map)) {
        html.push(`<div class="legend"><b>${acro}</b> = ${full}</div>`)
      }
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

/* JOB CONTROL
 * Storing and retrieving jobs from local storage
 * Loading jobs from file
 * Saving jobs to file
 * Export job results to file
 */

const IF_NAME = "ls"
const LAST_JOB_KEY = `${IF_NAME}LastJob`

const initJob = () => {
  const { found, job, content = {} } = rememberLastJob()
  if (found) {
    putJob(job, content)
  }
  else {
    startJob(job)
    memorizeThisJob()
  }
  activateBy()
  activateShow()
  activateSearch()
}

const startJob = job => {
  /* read start job settings from the corpus data
  */
  const query = {}
  const { ntypes, layers, by, show } = corpus

  const showLayers = {}
  let containerType

  tell({ show })
  for (const [nType, typeInfo] of Object.entries(layers)) {
    const { [nType]: showByType = {} } = show
    query[nType] = {}
    showLayers[nType] = []

    for (const layer of Object.keys(typeInfo)) {
      const { [layer]: { value = "" } = {} } = typeInfo
      const { [layer]: thisShow } = showByType

      query[nType][layer] = DEBUG ? value : ""

      if (thisShow) {
        showLayers[nType].push(layer)
      }
    }
  }
  tell({ showLayers })

  for (const nType of ntypes) {
    const { [nType]: thisBy } = by
    if (thisBy) {
      containerType = nType
    }
  }
  const jobContent = { query, display: { containerType, showLayers } }
  putJob(job, jobContent)
}

const cancelJobAction = () => {
  const jobaction = $("#jobaction")
  const newJob = $("#jobname")
  if (jobName != newJob.val()) {
    newJob.val(jobName)
  }
  jobaction.hide()
}

const activateJobs = () => {
  const jobaction = $("#jobaction")
  const jobname = $("#jobname")
  const jobnew = $("#newj")
  const jobrename = $("#renamej")
  const jobdelete = $("#deletej")

  jobaction.hide()
  jobname.off('keyup').keyup(() => {
    const newJob = $("#jobname").val()
    if (jobName == newJob) {
      jobaction.hide()
    }
    else {
      jobaction.show()
    }
  })
  jobnew.off('click').click(() => {
    const newJob = $("#jobname").val()
    tell(`end ${jobName} and start ${newJob}`)
    asNewJob(newJob)
    jobaction.hide()
  })
  jobrename.off('click').click(() => {
    const newJob = $("#jobname").val()
    renameJob(newJob)
    jobaction.hide()
  })
  jobdelete.off('click').click(() => {
    deleteJob()
  })
}

const asNewJob = newJob => {
  if (jobName == newJob) {
    return
  }
  jobName = newJob
  putJob(newJob, getJob())
  memorizeThisJob()
}

const renameJob = newJob => {
  if (jobName == newJob) {
    return
  }
  forgetJob(jobName)
  jobName = newJob
  putJob(newJob, getJob())
  memorizeThisJob()
}

const deleteJob = () => {
  const allJobs = rememberedJobs()
  if (allJobs.size <= 1) {
    // cannot delete last job
    return
  }
  const newJob = [...allJobs][0]
  forgetJob(jobName)
  switchJob(newJob)
}

const switchJob = job => {
  const jobContent = rememberJob(job)
  putJob(job, jobContent)
  memorizeThisJobName()
}

const memorizeThisJob = () => {
  const { name: appName } = corpus
  const jobKey = `${IF_NAME}/${appName}/${jobName}`
  localStorage.setItem(jobKey, JSON.stringify(getJob()))
  localStorage.setItem(LAST_JOB_KEY, jobName)
}

const rememberLastJob = () => {
  const { name: appName } = corpus
  const job = localStorage.getItem(LAST_JOB_KEY)
  const content = job ? rememberJob(job) : {}
  return { found: job, job: job || `${appName}-job`, content }
}

const memorizeThisJobName = () => {
  localStorage.setItem(LAST_JOB_KEY, jobName)
}

const rememberJob = job => {
  const { name: appName } = corpus
  const jobKey = `${IF_NAME}/${appName}/${job}`
  const jobContent = localStorage.getItem(jobKey)
  return jobContent ? JSON.parse(jobContent) : {}
}

const forgetJob = job => {
  const { name: appName } = corpus
  const jobKey = `${IF_NAME}/${appName}/${job}`
  localStorage.removeItem(jobKey)
}

const rememberedJobs = () => {
  const { name: appName } = corpus
  const lsPrefix = `${IF_NAME}/${appName}/`
  const lsLength = lsPrefix.length
  return new Set(
    Object.keys(localStorage)
      .filter(key => key.startsWith(lsPrefix))
      .map(key => key.substring(lsLength))
  )
}

const getJob = () => {
  /* read the job settings from the interface
  */
  const query = {}
  const { layers } = corpus

  for (const [nType, typeInfo] of Object.entries(layers)) {
    query[nType] = {}

    for (const layer of Object.keys(typeInfo)) {
      const box = $(`#pattern_${nType}_${layer}`)
      query[nType][layer] = box.val() || ''
    }
  }

  const { containerType, showLayers } = getDisplaySettings()
  const newShowLayers = {}
  for (const [nType, layers] of showLayers) {
    newShowLayers[nType] = layers
  }
  const display = { containerType, showLayers: newShowLayers }
  return { query, display }
}

const putJob = (job, jobContent) => {
  /* apply job settings to the interface
  */
  const { layers } = corpus

  const {
    query,
    display: { containerType, showLayers },
  } = jobContent

  jobName = job
  $("#jobname").val(jobName)

  for (const [nType, typeInfo] of Object.entries(layers)) {
    const { [nType]: tpShowLayers = [] } = showLayers
    const { [nType]: tpQuery } = query
    for (const layer of Object.keys(typeInfo)) {
      const box = $(`#pattern_${nType}_${layer}`)
      const { [layer]: value = '' } = tpQuery
      box.val(value)
      setBox('show', `${nType}-${layer}`, false)
    }
    for (const layer of tpShowLayers) {
      setBox('show', `${nType}-${layer}`, true)
    }
  }
  setBox('by', containerType, true)
  resetResults()
}

const saveJob = () => {
  /* save job settings to file
   * The file will be offered to the user as a download
   */
  const job = getJob()
  const text = JSON.stringify(job)
  download(text, jobName, 'json', false)
}

const saveResults = () => {
  /* save job results to file
   * The file will be offered to the user as a download
   */
  const lines = tabular()
  const text = lines.join('')
  download(text, jobName, 'tsv', true)
}

const download = (text, fileName, ext, asUtf16) => {
  /* collect data into a file for download
   * A downlaod will be prepared, with a given file name and extension.
   * The data is encoded as text in UTF-8 or in UTF-16
  */
  let blob

  if (asUtf16) {
    /* it turns out we need this clumsy detour via byte arrays
     * because otherwise the BOM mark will not be written correctly
     */
    const byteArray = []

    // BOM Mark
    byteArray.push(255, 254)

    // Low level way to translate each uniocode character into 16 bits
    for (let i = 0; i < text.length; ++i) {
      const charCode = text.charCodeAt(i)
      byteArray.push(charCode & 0xff)
      byteArray.push((charCode / 256) >>> 0)
    }

    blob = new Blob([new Uint8Array(byteArray)], {
      type: 'text/plain;charset=UTF-16LE;',
    })
  } else {
    blob = new Blob([text], { type: 'text/plain;charset=UTF-8;' })
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${fileName}.${ext}`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const activateImport = () => {
  /* activate job import button
   * This will prompt to select a file and then read the file
   * and apply the job settings to the interface
  */
  const fileSelect = $('#importj')
  const fileElem = $('#imjname')

  fileSelect.off('click').click(e => {
    fileElem.click()
    e.preventDefault()
  })

  function handleFiles() {
    const { files } = this
    if (!files.length) {
      alert('No file selected')
    } else {
      for (const file of files) {
        const reader = new FileReader()
        const job = file.match(/([^/]+)\.[^.]*$/)
        reader.onload = e => {
          putJob(job, JSON.parse(e.target.result))
        }
        reader.readAsText(file)
      }
    }
  }

  fileElem.off('change').change(handleFiles)
}

const activateExport = () => {
  /* activate job/results export buttons
  */

  // export job settings
  const expjButton = $('#exportj')
  expjButton.off('click').click(() => {
    saveJob()
  })

  // export job results
  const exprButton = $('#exportr')
  exprButton.off('click').click(() => {
    if (resultsByType == null) {
      alert('Query has not been executed yet')
      return
    }

    saveResults()
  })
}

/* MAIN CONTROL
 * We take care to use an async function for the longish
 * initialization, so that we can display progress messages
 * in the mean time
 */

/*
const sleep = async seconds => {
  // to be called as: await sleep(n)
  //
  tell(`before sleep ${seconds}`)
  await new Promise(r => setTimeout(r, seconds * 1000))
  tell(`after sleep ${seconds}`)
}
*/

const init = async () => {
  const pbox = $('#progress')
  dressUp()
  warmUpData()
  addWidgets()
  activateNumberControl()
  initJob()
  activateJobs()
  activateImport()
  activateExport()
  clearProgress(pbox)
}

$(() => {
  const pbox = $('#progress')
  clearProgress(pbox)
  showProgress(pbox, 'Initializing ...')
  init()
})
