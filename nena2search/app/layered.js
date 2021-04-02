/*eslint-env jquery*/

/* global corpus */

const NUMBER = 'number'
const DEBUG = true
const WINDOW = 20
const { simpleBase } = corpus

const tell = msg => {
  if (DEBUG) {
    console.log(msg)
  }
}

let resultsByType = null
let resultsComposed = null
let resultTypeMap = null
let focusPos = 0

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

  resultsByType = {}

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
}

const weed = () => {
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

const getDescendants = (u, uTypeIndex) => {
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

const compose = () => {
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

const gotoFocus = () => {
  const rTarget = $(`.focus`)
  if (rTarget != null && rTarget[0] != null) {
    rTarget[0].scrollIntoView({ block: 'center' })
  }
}

const grabQuery = () => {
  const query = {}
  const { layers } = corpus

  for (const [nType, typeInfo] of Object.entries(layers)) {
    query[nType] = {}

    for (const layer of Object.keys(typeInfo)) {
      const box = $(`#pattern_${nType}_${layer}`)
      query[nType][layer] = box.val() || ""
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
      const tpLayer = `${nType}:${layer}`
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
      lines.push(`${thisLine.join("\t")}\n`)
    }
  }

  return lines
}

const getHLText = (iPositions, matches, text) => {
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
  const { layers, texts, iPositions, ntypesI } = corpus
  const { showLayers } = getDisplaySettings()

  const genValueHtml = (nType, layer, node) => {
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

    const hlClass = (simpleBase && ntypesI.get(nType) == 0) ? '' : nodes.has(n) ? ' hlh' : 'o'

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

  const genResultHtml = (i, result, isFocus) => {
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

const showStats = stats => {
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

const goAction = () => {
  const button = $(`#go`)
  button.off('click').click(e => {
    e.preventDefault()
    gather()
    const stats = weed()
    showStats(stats)
    compose()
    display()
  })
}

const defaultByType = () => {
  const { ntypes } = corpus
  const pos = Math.round(ntypes.length / 2)
  return ntypes[pos]
}

const addWidgets = () => {
  const where = $('#querybody')
  const { ntypesR, layers } = corpus
  const html = []

  for (const nType of ntypesR) {
    const typeInfo = layers[nType] || {}
    html.push(genTypeWidgets(nType, typeInfo))
  }
  where.html(html.join(''))
  activateBy()
  activateShow()

  goAction()
}

const genTypeWidgets = (nType, typeInfo) => {
  const {
    by: { [nType]: theBy },
  } = corpus
  const checked = theBy ? ' checked' : ''

  const html = []
  html.push(`
<tr class="qtypefirst">
  <td><input type="radio" name="by" value="${nType}" ${checked}></td>
  <td></td>
  <td class="lvcell"><span class="lv">${nType}</span></td>
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

const getRadio = name => $(`input[name="${name}"]:checked`).val()

const getChecked = name =>
  $(`input[name="${name}"]:checked`)
    .map((i, elem) => elem.value)
    .get()

const activateBy = () => {
  $(`input[name="by"]`)
    .off('click')
    .click(() => {
      if (resultsByType != null) {
        compose()
        display()
      }
    })
}

const activateShow = () => {
  $(`input[name="show"]`)
    .off('click')
    .click(() => {
      if (resultsByType != null) {
        display()
      }
    })
}

const genWidget = (nType, layer, info, isLast) => {
  const {
    show: { [nType]: { [layer]: theShow } = {} },
  } = corpus
  const checked = theShow ? ' checked' : ''

  const value = DEBUG ? info['value'] || '' : ''
  const lastCls = isLast ? ` class="qtypelast"` : ''
  return `
<tr${lastCls}>
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

const save = fileName => {
  const job = grabQuery()
  const text = JSON.stringify(job)
  tell({ job, text })
  download(text, fileName, "json", false)
}

const deliver = fileName => {
  const lines = tabular()
  const text = lines.join("")
  download(text, fileName, "tsv", true)
}

const download = (text, fileName, ext, asUtf16) => {
  let blob

  if (asUtf16) {
    const byteArray = []

    byteArray.push(255, 254)

    for (let i = 0; i < text.length; ++i) {
      const charCode = text.charCodeAt(i)
      byteArray.push(charCode & 0xff)
      byteArray.push(charCode / 256 >>> 0)
    }

    blob = new Blob([new Uint8Array(byteArray)], {type: "text/plain;charset=UTF-16LE;"})
  }
  else {
    blob = new Blob([text], {type: "text/plain;charset=UTF-8;"})
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute("href", url)
  link.setAttribute("download", `${fileName}.${ext}`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const activateNumberControl = () => {
  const slider = $('#slider')
  const setter = $('#setter')
  const minp = $('#minp')
  const min2p = $('#min2p')
  const maxp = $('#maxp')
  const max2p = $('#max2p')

  slider.off('change').change(() => {
    focusPos = slider.val()
    setter.val(focusPos)
    display()
  })
  setter.off('change').change(() => {
    focusPos = setter.val()
    slider.val(focusPos)
    display()
  })
  minp.off('click').click(() => {
    focusPos = Math.max(0, focusPos - WINDOW)
    setter.val(focusPos)
    slider.val(focusPos)
    display()
  })
  min2p.off('click').click(() => {
    focusPos = Math.max(0, focusPos - 2 * WINDOW)
    setter.val(focusPos)
    slider.val(focusPos)
    display()
  })
  maxp.off('click').click(() => {
    focusPos = Math.min((resultsComposed || []).length - 1, focusPos + WINDOW)
    setter.val(focusPos)
    slider.val(focusPos)
    display()
  })
  max2p.off('click').click(() => {
    focusPos = Math.min((resultsComposed || []).length - 1, focusPos + 2 * WINDOW)
    setter.val(focusPos)
    slider.val(focusPos)
    display()
  })
}

const activateExport = () => {
  const exprButton = $('#exportr')
  const exprName = $('#exrname')
  exprButton.off('click').click(() => {
    if (resultsByType == null) {
      alert('Query has not been executed yet')
      return
    }
    const fileName = exprName.val()
    if (fileName == null || fileName == '') {
      alert('Give a file name for the exported results')
      return
    }

    deliver(fileName)
  })
  const expjButton = $('#exportj')
  const expjName = $('#exjname')
  expjButton.off('click').click(() => {
    const fileName = expjName.val()
    if (fileName == null || fileName == '') {
      alert('Give a file name for the exported query')
      return
    }

    save(fileName)
  })
}

/* main
 *
 */

$(() => {
  const pbox = $('#progress')
  dressUp()
  warmUpData()
  addWidgets()
  activateNumberControl()
  activateExport()
  clearProgress(pbox)
})
