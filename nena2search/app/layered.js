/*eslint-env jquery*/

/* global corpus */


/* CONFIG DATA */

const NUMBER = "number"
const DEBUG = false
const QU_WINDOW = 10
const MaxReLength = 1000

/* INFORMATIONAL MESSAGES
 *
 * Progress and debug messages
 */

const tell = msg => {
  /* issue a debug message to the console
   * Only if the DEBUG flag is true
  */
  if (DEBUG) {
    console.log(msg)
  }
}

const showError = (box, ebox, msg) => {
  /* Show an error on the interface
   * The error is shown in element ebox,
   * and the element box receives error formatting
   */
  console.error(msg)
  box.addClass("error")
  ebox.html(msg)
}

const clearError = (box, ebox) => {
  /* Clear error formatting in specified locations
   * See showError
   */
  box.removeClass("error")
  ebox.html("")
}

const showProgress = (box, msg) => {
  /* Show a progress message on the interface
   * The message is shown in element box
   */
  box.append(`${msg}<br>`)
}

const clearProgress = pbox => {
  /* Clear progress messages in specified location
   * See showProgress
  */
  pbox.html("")
}

/* THE CORPUS
 *
 * The fixed corpus data is in the global var corpus,
 * coming from corpus.js which is imported before this script.
 */

const { simpleBase } = corpus
/* This is the base type of the corpus, e.g. word or letter
*/

const warmUpData = () => {
  /* Expand parts of the corpus data that have been optimized before shipping
  */
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

const decompress = () => {
  /* The map "up" is expanded. We also compute its converse, "down".
  */
  const { up } = corpus
  const newUp = new Map()
  const down = new Map()

  for (const line of up) {
    const [spec, uStr] = line.split("\t")
    const u = uStr >> 0
    if (!down.has(u)) {
      down.set(u, new Set())
    }

    const ns = []
    const ranges = spec.split(",")

    for (const range of ranges) {
      const bounds = range.split("-").map(x => x >> 0)
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
  /* The corpus contains position-to-node mappings
   * for all relevant nodes.
   * We make the inverses of these mappings here.
   */
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

/* THE STATE
 *
 * The state contains changeable information needed to present the
 * interface.
 * It contains two kinds of information
 *   1. the search results (in various forms)
 *   2. the user interactions (button clicks and text entered into text fields)
 *   3. the jobName (a job contains the essential info to recreate a search session)
 *
 * As to 1: the following members are present
 *   1a. resultsByType: for each node type:
 *       1a1. (nodes) the set of nodes that match the query
 *            (they match all layers of this node type, and when you
 *            project the nodes to other node types, they match all layers
 *            of those types as well)
 *       1a2. (matches) for each layer of this type the mapping from nodes
 *            to matched character positions
 *  1b. resultsComposed: an array of results; when a composeType is chosen,
 *      we generate the results from resultsByType and store them here.
 *      A result consists of a node of the containerType, plus its
 *      ancestor nodes from higher types, plus all of its descendent nodes
 *      in lower types. A result only contains the nodes, not yet actual
 *      matched text.
 *      In order to render the results table, we need both resultsByType and
 *      resultsComposed.
 *  1c. resultTypeMap: a mapping of nodes to node types, for all nodes that
 *      occur in rendered results (including non-matching descendants
 *      of matching container nodes).
 *
 * As to 2: jobState contains all fields that relate to concrete user interactions
 *   The jobState is what gets serialized when we store/retrieve jobs,
 *   whether in localStorage or in files.
 *   The following members are present
 *     2a. query: for each node type and each layer in that type, the search pattern,
 *         i.e. a regex
 *     2b. dirty: whether the results in the state are out of sync with the query
 *         in the state.
 *         This becomes true when a user edits the search patterns but has not yet
 *         executed the new query
 *     2c. containerType: the node type used for composing results
 *     2d. showLayer: for each node type and each layer in that type, whether that layer
 *         must be shown in the results
 *     2e. focusPos: the current position in the table of results: this is what is shown
 *         in the middle of the screen if possible, together with a number of rows above
 *         and below, given by QU_WINDOW.
 *         The focused result will be marked strongly on the interface.
 *     2f. prevFocusPos: the previous focusPos.
 *         The result at this position will be marked lightly.
 *
 * As to 3: jobName is the name of the current search session, aka job.
 *   When we store a jobState in localStorage, we use this is key.
 *   When we store a jobState on file, we use this as file name.
 *
 * MUTABLE STATE
 *
 * Contrary React-Redux practice, our state is mutable.
 * We do not work with cycles that rerender the display after state changes,
 * so we do not need to detect state changes efficiently.
 * Instead, at each state change, we also update the interface.
 *
 * GETTING the state
 *
 * We ALWAYS access the state by destructuring, like so:
 * (if variables nType and layer have values, we retrieve the search pattern as follows:
 * const {
 *  jobState: { query: { [nType]: { [layer]: pattern } = {} } = {} } = {}
 * } = state
 *
 * N.B. We take care to insert default values ( = {} ) for all the intermediate
 * subobjects, to accomodate the case where the state has not (yet)
 * corresponding members.
 *
 * SETTING the state
 *
 * We ALWAYS update the state by the function stateUpdate, like so
 *
 * stateUpdate({ a: x, b: y })
 *   here we update two members of the state, a and b, with values x and y resp.
 *
 * stateUpdate({ text: "foo" }, ["jobState", "query", "word"])
 *   here we update an inner member of the state, namely "text" which sits
 *   under jobState and then query and the word.
 *
 * We get the state object back. It is still the same object as the one we
 * used to get state information. But returning it enables patterns where
 * we set a state member and then use that value in a local variable:
 *
 * const { resultsByType } = stateUpdate({ resultsByType: {} })
 *
 * */

const state = { resultsByType: null,
  resultsComposed: null,
  resultTypeMap: null,
  jobName: null,
  jobState: { query: {},
    dirty: false,
    containerType: null,
    showLayer: {},
    focusPos: null,
    prevFocusPos: null } }

const stateUpdate = (updates, subkeys) => {
  /* update the state by means of an object data containing the updates
   * The structure of the updates reflects the structure of a (part of) the state.
   * The optional subkeys is an array which specifies a path into the
   * structure of the state to which the updates must be applied.
   */
  let dest = state
  if (subkeys) {
    for (const subkey of subkeys) {
      const { [subkey]: newDest } = dest
      if (newDest === undefined) {
        dest[subkey] = {}
      }
      dest = dest[subkey]
    }
  }
  for (const [k, v] of Object.entries(updates)) {
    dest[k] = v
  }
  return state
}

/* APPLY STATE TO INTERFACE
 *
 * We can apply part of the state to the interface.
 */

const applyJob = run => {
  /* apply jobState to the interface
   */
  const { layers } = corpus

  const {
    jobName, jobState: { query = {}, containerType, showLayers = {} } = {},
  } = state

  $("#jobname").val(jobName)
  $("#jchange").val(jobName)

  for (const [nType, typeInfo = {}] of Object.entries(layers)) {
    const { [nType]: tpShowLayers = {} } = showLayers
    const { [nType]: tpQuery = {} } = query
    for (const layer of Object.keys(typeInfo)) {
      const { [layer]: pattern = "" } = tpQuery
      const box = $(`#pattern_${nType}_${layer}`)
      box.val(pattern)
      const { [layer]: show } = tpShowLayers
      setBox("show", `[ntype="${nType}"][layer="${layer}"]`, show)
    }
  }
  setBox("ctype", `[value="${containerType}"]`, true)
  applyResults(run)
}

const setBox = (name, spec, onoff) =>
  /* Check or uncheck radio and checkboxes.
   * name is what is in their "name" attribute,
   * with spec you can pass additional selection criteria,
   * as a jQuery selector
   * onoff is true or false: true will check, false will uncheck
   */
  $(`input[name="${name}"]${spec}`).prop("checked", onoff)

const applyResults = run => {
  /* fill in the results of a job
   * Only needed when a new job has been loaded (specified by run=true).
   * If so, and if the query in the job is not dirty,
   * we run the query and display the results.
   * If the query is dirty, we clear all result components in the state.
   */
  const { jobState: { dirty } = {} } = state
  if (run) {
    if (dirty) {
      const statsbody = $("#statsbody")
      const resultsbody = $("#resultsbody")

      statsbody.html("")
      resultsbody.html("")
      applyFocus()

      stateUpdate({ resultsByType: null, resultsComposed: null, resultTypeMap: null })
      stateUpdate({ prevFocusPos: null, dirty: false }, ["jobState"])
    } else {
      runQuery()
    }
  }
}

const applyFocus = () => {
  /* adjust the interface to the current focus
   * Especially the result navigation controls and the slider
  */
  const { resultsComposed, jobState: { focusPos } = {} } = state
  const setter = $("#setter")
  const setterw = $("#setterw")
  const slider = $("#slider")
  const sliderw = $("#sliderw")
  const total = $("#total")
  const totalw = $("#totalw")
  const minp = $("#minp")
  const min2p = $("#min2p")
  const mina = $("#mina")
  const maxp = $("#maxp")
  const max2p = $("#max2p")
  const maxa = $("#maxa")
  const nResults = resultsComposed == null ? 0 : resultsComposed.length
  const nResultsP = Math.max(nResults, 1)
  const stepSize = Math.max(Math.round(nResults / 100), 1)
  const focusVal = focusPos == null ? 0 : focusPos + 1
  const totalVal = focusPos == null ? 0 : nResults
  setter.attr("max", nResultsP)
  setter.attr("step", stepSize)
  slider.attr("max", nResultsP)
  slider.attr("step", stepSize)
  setter.val(focusVal)
  slider.val(focusVal)
  total.html(totalVal)

  sliderw.hide()
  setterw.hide()
  totalw.hide()
  minp.removeClass("active")
  min2p.removeClass("active")
  mina.removeClass("active")
  maxp.removeClass("active")
  max2p.removeClass("active")
  maxa.removeClass("active")

  if (focusPos != null) {
    setterw.show()
    totalw.show()
    if (nResults > 2 * QU_WINDOW) {
      sliderw.show()
    }
    if (focusPos < nResults - 1) {
      maxa.addClass("active")
      maxp.addClass("active")
    }
    if (focusPos + QU_WINDOW < nResults - 1) {
      max2p.addClass("active")
    }
    if (focusPos > 0) {
      mina.addClass("active")
      minp.addClass("active")
    }
    if (focusPos - QU_WINDOW > 0) {
      min2p.addClass("active")
    }
  }
}

const gotoFocus = () => {
  /* scrolls the interface to the result that is in focus
   */
  const rTarget = $(`.focus`)
  if (rTarget != null && rTarget[0] != null) {
    rTarget[0].scrollIntoView({ block: "center" })
  }
}

/* INITIALIZE DYNAMIC PARTS OF THE INTERFACE
 *
 * Almost everything on the interface is depending on the data
 * that is encountered in the corpus.
 * Here we generate HTML and place it in the DOM
 */

const dressUp = () => {
  /* fill in title and description
  */
  const { description, captions: { title } } = corpus
  $("head>title").html(title)
  $("#title").html(title)
  $("#description").html(description)
}

const addWidgets = () => {
  /* Generate all search controls
   * and put them on the interface
   */
  const querybody = $("#querybody")
  const { ntypesR, layers, levels } = corpus
  const html = []

  for (const nType of ntypesR) {
    const typeInfo = layers[nType] || {}
    const description = levels[nType] || {}
    html.push(genTypeWidgets(nType, description, typeInfo))
  }
  querybody.html(html.join(""))
}

const genTypeWidgets = (nType, description, typeInfo) => {
  /* Generate html for the search controls for a node type
   */
  const nTypeRep = description
    ? `<details>
         <summary class="lv">${nType}</summary>
         <div>${description}</div>
        </details>`
    : `<span class="lv">${nType}</span>`

  const html = []
  html.push(`
<tr class="qtype">
  <td><input type="radio" name="ctype" value="${nType}"></td>
  <td></td>
  <td class="lvcell">${nTypeRep}</td>
  <td></td>
</tr>
`)

  const theseLayers = Object.entries(typeInfo)
  for (const [layer, info] of theseLayers) {
    html.push(genWidget(nType, layer, info))
  }
  return html.join("")
}

const genWidget = (nType, layer, info) =>
  /* Generate html for the search controls for a single layer
   */
  `
<tr>
  <td></td>
  <td><input
    type="checkbox" name="show" ntype="${nType}" layer="${layer}" value="1"
  ></td>
  <td>
    <input
      type="text"
      id="pattern_${nType}_${layer}"
      ntype="${nType}"
      layer="${layer}"
      class="pattern"
      maxlength="${MaxReLength}"
      value=""
    >
    <span id="error_${nType}_${layer}" class="error"></span>
  </td>
  <td>${genLegend(nType, layer, info)}</td>
</tr>
`

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
  return html.join("")
}

/* MAKE THE INTERFACE ACTIVE
 *
 * Add actions to the controls of the search interface,
 * including those for navigating the results
 */
const activateSearch = () => {
  /* make the search button active
   */
  const button = $(`#go`)
  button.off("click").click(e => {
    e.preventDefault()
    runQuery()
    stateUpdate({ dirty: false }, ["jobState"])
    memorizeThisJob()
  })
  /* store the search patterns when they change
   */
  const patterns = $(".pattern")
  patterns.off("change").change(e => {
    const elem = $(e.target)
    const nType = elem.attr("ntype")
    const layer = elem.attr("layer")
    const { target: { value } } = e
    stateUpdate({ dirty: true }, ["jobState"])
    stateUpdate({ [layer]: value }, ["jobState", "query", nType])
    memorizeThisJob()
  })
}

const activateContainerType = () => {
  /* make the "ctype" radio buttons active
   * (when a user chooses the container type for composing results)
   */
  $(`input[name="ctype"]`)
    .off("click")
    .click(e => {
      const { target: { value: containerType } } = e
      stateUpdate({ containerType }, ["jobState"])
      composeResults(true)
      displayResults()
      memorizeThisJob()
    })
}

const activateShow = () => {
  /* make the "show" checkboxes active
   * (when the user chooses which layers to include in the results)
   */
  const { resultsByType } = state
  $(`input[name="show"]`)
    .off("click")
    .click(e => {
      if (resultsByType != null) {
        displayResults()
      }
      const elem = $(e.target)
      const nType = elem.attr("ntype")
      const layer = elem.attr("layer")
      const checked = elem.prop("checked")
      stateUpdate({ [layer]: checked }, ["jobState", "showLayers", nType])
      displayResults()
      memorizeThisJob()
    })
}

const activateNumberControl = () => {
  /* make the number controls active
   *   the result slider
   *   the input box for the focus position
   * Keep the various ways of changing the focus position synchronized
   */
  const slider = $("#slider")
  const setter = $("#setter")
  const minp = $("#minp")
  const min2p = $("#min2p")
  const mina = $("#mina")
  const maxp = $("#maxp")
  const max2p = $("#max2p")
  const maxa = $("#maxa")

  slider.off("change").change(() => {
    let { jobState: { focusPos } = {} } = state
    stateUpdate({ prevFocusPos: focusPos }, ["jobState"])
    focusPos = checkFocus(slider.val() - 1)
    stateUpdate({ focusPos }, ["jobState"])
    memorizeThisJob()
    displayResults()
  })
  setter.off("change").change(() => {
    let { jobState: { focusPos } = {} } = state
    stateUpdate({ prevFocusPos: focusPos }, ["jobState"])
    focusPos = checkFocus(setter.val() - 1)
    stateUpdate({ focusPos }, ["jobState"])
    memorizeThisJob()
    displayResults()
  })
  minp.off("click").click(() => {
    let { jobState: { focusPos } = {} } = state
    if (focusPos == null) {
      return
    }
    stateUpdate({ prevFocusPos: focusPos }, ["jobState"])
    focusPos = checkFocus(focusPos - 1)
    stateUpdate({ focusPos }, ["jobState"])
    memorizeThisJob()
    displayResults()
  })
  min2p.off("click").click(() => {
    let { jobState: { focusPos } = {} } = state
    if (focusPos == null) {
      return
    }
    stateUpdate({ prevFocusPos: focusPos }, ["jobState"])
    focusPos = checkFocus(focusPos - QU_WINDOW)
    stateUpdate({ focusPos }, ["jobState"])
    memorizeThisJob()
    displayResults()
  })
  mina.off("click").click(() => {
    let { jobState: { focusPos } = {} } = state
    if (focusPos == null) {
      return
    }
    stateUpdate({ prevFocusPos: focusPos }, ["jobState"])
    focusPos = 0
    stateUpdate({ focusPos }, ["jobState"])
    memorizeThisJob()
    displayResults()
  })
  maxp.off("click").click(() => {
    let { jobState: { focusPos } = {} } = state
    if (focusPos == null) {
      return
    }
    stateUpdate({ prevFocusPos: focusPos }, ["jobState"])
    focusPos = checkFocus(focusPos + 1)
    stateUpdate({ focusPos }, ["jobState"])
    memorizeThisJob()
    displayResults()
  })
  max2p.off("click").click(() => {
    let { jobState: { focusPos } = {} } = state
    if (focusPos == null) {
      return
    }
    stateUpdate({ prevFocusPos: focusPos }, ["jobState"])
    focusPos = checkFocus(focusPos + QU_WINDOW)
    stateUpdate({ focusPos }, ["jobState"])
    memorizeThisJob()
    displayResults()
  })
  maxa.off("click").click(() => {
    let { jobState: { focusPos } = {} } = state
    if (focusPos == null) {
      return
    }
    stateUpdate({ prevFocusPos: focusPos }, ["jobState"])
    focusPos = checkFocus(-1)
    stateUpdate({ focusPos }, ["jobState"])
    memorizeThisJob()
    displayResults()
  })
}

const checkFocus = focusPos => {
  /* take care that the focus position is always within
   * the correct range with respect to the number of results
   */
  const { resultsComposed } = state
  const nResults = resultsComposed == null ? 0 : resultsComposed.length
  if (focusPos == -1 || focusPos >= nResults) {
    return nResults - 1
  }
  if (focusPos < 0) {
    return 0
  }
  return focusPos
}

const activateImport = () => {
  /* activate job import button
   * This will prompt to select a file and then read the file
   * and apply the job settings to the interface
   */
  const fileSelect = $("#importj")
  const fileElem = $("#imjname")

  fileSelect.off("click").click(e => {
    fileElem.click()
    e.preventDefault()
  })

  fileElem.off("change").change(e => importFile(e.target))
}

const activateExport = () => {
  /* activate job/results export buttons
   */

  // export job settings
  const expjButton = $("#exportj")
  expjButton.off("click").click(() => {
    saveJob()
  })

  // export job results
  const exprButton = $("#exportr")
  exprButton.off("click").click(() => {
    const { resultsByType } = state
    if (resultsByType == null) {
      alert("Query has not been executed yet")
      return
    }

    saveResults()
  })
}

const saveResults = () => {
  /* save job results to file
   * The file will be offered to the user as a download
   */
  const { jobName } = state
  const lines = tabular()
  const text = lines.join("")
  download(text, jobName, "tsv", true)
}

/* SEARCH EXECUTION
 *
 * The implementation of layered search:
 *
 * 1. gather:
 *    - match the regular expressions against the texts of the layers,
 *    - for each node type, take the intersection of the resulting
 *      nodesets in the layers
 * 2. weed (the heart of the layered search algorithm):
 *    - intersect across node types (using projection to
 *      upward and downward levels
 * 3. compose:
 *    - organize the result nodes around the nodes in a container type
 * 4. display:
 *    - show the table of results on the interface
 *    - by screenfuls
 *    - make navigation controls for moving the focus through the table
 */

const runQuery = () => {
  /* Performs a complete query
   * The individual sub steps each check whether there is something to do
   */
  gather()
  const stats = weed()
  showStats(stats)
  composeResults(false)
  displayResults()
}

const doSearch = (nType, layer, info, regex) => {
  /* perform regular expression search for a single layer
   * return character positions and nodes that hold those positions
   */
  const { texts: { [nType]: { [layer]: text } }, positions } = corpus
  const { pos: posKey } = info
  const { [nType]: { [posKey]: pos } } = positions
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
  const { resultsByType } = stateUpdate({ resultsByType: {} })

  for (const nType of ntypesR) {
    const { [nType]: typeInfo = {} } = layers
    let intersection = null
    const matchesByLayer = {}

    for (const [layer, info] of Object.entries(typeInfo)) {
      const box = $(`#pattern_${nType}_${layer}`)
      const ebox = $(`#error_${nType}_${layer}`)
      clearError(box, ebox)
      const pattern = box.val()
      if (pattern == null || pattern == "") {
        continue
      }
      if (pattern.length > MaxReLength) {
        showError(
          box,
          ebox,
          `pattern must be less than ${MaxReLength} characters long`
        )
        continue
      }
      let regex
      try {
        regex = new RegExp(pattern, "g")
      } catch (error) {
        showError(box, ebox, `"${pattern}": ${error}`)
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
  const { resultsByType } = state
  const stats = {}

  // determine highest and lowest types in which a search has been performed
  let hi = null
  let lo = null

  for (let i = 0; i < ntypes.length; i++) {
    const nType = ntypes[i]
    const { [nType]: { nodes } } = resultsByType

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
    const { [upType]: { nodes: upNodes }, [dnType]: resultsDn = {} } = resultsByType
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
      resultsDn["nodes"] = dnNodes
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
    const { [upType]: resultsUp = {}, [dnType]: { nodes: dnNodes } } = resultsByType

    const upNodes = new Set()
    for (const dn of dnNodes) {
      if (up.has(dn)) {
        upNodes.add(up.get(dn))
      }
    }
    resultsUp["nodes"] = upNodes
  }

  // project downwards from the lowest level to the bottom type

  for (let i = lo; i > 0; i--) {
    const upType = ntypes[i]
    const dnType = ntypes[i - 1]
    const { [upType]: { nodes: upNodes }, [dnType]: resultsDn = {} } = resultsByType
    const dnNodes = new Set()
    for (const un of upNodes) {
      if (down.has(un)) {
        for (const dn of down.get(un)) {
          dnNodes.add(dn)
        }
      }
    }
    resultsDn["nodes"] = dnNodes
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
  const statsbody = $("#statsbody")
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
  statsbody.html(html.join(""))
}

const composeResults = recomputeFocus => {
  /* divided search results into chunks by containerType
   * The results are organized by the result nodes that have containerType as node type.
   * Each result will have three parts:
   *   ancestor nodes: result nodes of higher types that contain the container node
   *   container node: one node of the containerType
   *   descendant nodes: all descendants of the container node
   * The result at the position that has currently focus on the interface,
   * is marked by means of a class
   *
   * recomputeFocus = true:
   * If we do a new compose because the user has changed the container type
   * we estimate the focus position in the new container type based on the
   * focus position in the old container type
   * We adjust the interface to the new focus pos (slider and number controls)
   */
  const { ntypesI, up, utypeOf } = corpus
  const {
    resultsByType,
    resultsComposed: oldResultsComposed,
    jobState: {
      focusPos: oldFocusPos,
      prevFocusPos: oldPrevFocusPos,
      dirty: oldDirty,
      containerType,
    } = {},
  } = state
  if (resultsByType == null) {
    stateUpdate({ resultsComposed: null })
    return
  }

  const { [containerType]: { nodes: containerNodes } = {} } = resultsByType

  const oldNResults = oldResultsComposed == null ? 1 : oldResultsComposed.length
  const oldNResultsP = Math.max(oldNResults, 1)
  const oldRelative = oldFocusPos / oldNResultsP
  const oldPrevRelative = oldPrevFocusPos / oldNResultsP

  const {
    resultsComposed, resultTypeMap,
  } = stateUpdate({ resultsComposed: [], resultTypeMap: new Map() })

  if (containerNodes) {
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
  }
  const nResults = resultsComposed == null ? 0 : resultsComposed.length
  let focusPos = oldDirty ? null : oldFocusPos,
    prevFocusPos = oldDirty ? null : oldPrevFocusPos
  if (recomputeFocus) {
    focusPos = Math.min(nResults, Math.round(nResults * oldRelative))
    prevFocusPos = Math.min(nResults, Math.round(nResults * oldPrevRelative))
  } else {
    if (focusPos == null) {
      focusPos = nResults == 0 ? -1 : 0
      prevFocusPos = null
    } else if (focusPos > nResults) {
      focusPos = 0
      prevFocusPos = null
    }
  }

  stateUpdate({ focusPos, prevFocusPos }, ["jobState"])
}

const defaultContainerType = () => {
  /* If no default container type has been given,
   * define one: take a type in the middle of all node types
   */
  const { ntypes } = corpus
  const pos = Math.round(ntypes.length / 2)
  return ntypes[pos]
}

const getDescendants = (u, uTypeIndex) => {
  /* get all descendents of a node, organized by node type
   * This is an auxiliary function for composeResults()
   * The function calls itself recursively for all the children of
   * the node in a lower level
   * returns an array of subarrays, where each subarray corresponds to a child node
   * and has the form [node, [...descendants of node]]
   */
  if (uTypeIndex == 0) {
    return []
  }

  const { down, dtypeOf, ntypes } = corpus
  const { resultTypeMap } = state

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

const displayResults = () => {
  /* Displays composed results on the interface.
   * Results are displayed in a table, around a focus position
   * We only display a limited amount of results around the focus position,
   * but the user can move the focus position in various ways.
   * Per result we show this:
   *   Ancestor nodes are rendered highlighted
   *   The container nodes themselves are rendered as single nodes
   *     if they have content, otherwise they are left out
   *   The descendants of the container node are rendered with
   *   all of descendants (recursively),
   *     where the descendants that have results are highlighted.
   */
  const { layers, texts, iPositions, ntypesI } = corpus
  const {
    resultTypeMap,
    resultsByType,
    resultsComposed,
    jobState: { showLayers, focusPos, prevFocusPos } = {},
  } = state
  if (resultsByType == null) {
    stateUpdate({ resultsComposed: null })
    return
  }

  const genValueHtml = (nType, layer, node) => {
    /* generates the html for a layer of node, including the result highlighting
     */
    const { [nType]: { [layer]: { pos: posKey } } } = layers
    const { [nType]: { [layer]: text } } = texts
    const { [nType]: { [posKey]: iPos } } = iPositions
    const nodeIPositions = iPos.get(node)
    const { [nType]: { matches: { [layer]: matches } = {} } } = resultsByType
    const nodeMatches =
      matches == null || !matches.has(node) ? new Set() : matches.get(node)

    const spans = getHLText(nodeIPositions, nodeMatches, text)

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
    /* generates the html for a node, including all layers and highlighting
     */
    const [n, children] = typeof node === NUMBER ? [node, []] : node
    const nType = resultTypeMap.get(n)
    const { [nType]: { nodes } = {} } = resultsByType
    const { [nType]: tpLayers = {} } = showLayers

    const theLayers = tpLayers
      ? Object.entries(tpLayers)
          .filter(x => x[1])
          .map(x => x[0])
      : []
    const nLayers = theLayers.length
    const hasLayers = nLayers > 0
    const hasSingleLayer = nLayers == 1
    const hasChildren = children.length > 0
    if (!hasLayers && !hasChildren) {
      return ""
    }

    const hlClass =
      simpleBase && ntypesI.get(nType) == 0 ? "" : nodes.has(n) ? " hlh" : "o"

    const hlRep = hlClass == "" ? "" : ` class="${hlClass}"`
    const lrRep = hasSingleLayer ? "" : ` m`
    const hdRep = hasChildren ? "h" : ""

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

    return html.join("")
  }

  const genAncestorsHtml = ancestors => {
    /* generates the html for the ancestor nodes of a result
     */
    const html = ancestors.map(anc => genNodeHtml(anc))
    return html.join(" ")
  }

  const genResHtml = (cn, descendants) => {
    /* generates the html for the container node and descendant nodes of a result
     */
    const html = []
    html.push(`${genNodeHtml(cn)} `)
    for (const desc of descendants) {
      html.push(genNodeHtml(desc))
    }
    return html.join("")
  }

  const genResultHtml = (i, result) => {
    /* generates the html for a single result
     */
    const isFocus = i == focusPos
    const isPrevFocus = i == prevFocusPos
    const { ancestors, cn, descendants } = result
    const ancRep = genAncestorsHtml(ancestors)
    const resRep = genResHtml(cn, descendants)
    const focusCls = isFocus
      ? ` class="focus"`
      : isPrevFocus
      ? ` class="pfocus"`
      : ""

    return `
<tr${focusCls}>
  <th>${i + 1}</th>
  <td>${ancRep}</td>
  <td>${resRep}</td>
</tr>
  `
  }

  const genResultsHtml = () => {
    /* generates the html for all relevant results around a focus position in the
     * table of results
     */
    if (resultsComposed == null) {
      return ""
    }
    const startPos = Math.max((focusPos || 0) - 2 * QU_WINDOW, 0)
    const endPos = Math.min(
      startPos + 4 * QU_WINDOW + 1,
      resultsComposed.length - 1
    )
    const html = []
    for (let i = startPos; i <= endPos; i++) {
      html.push(genResultHtml(i, resultsComposed[i], i == focusPos))
    }
    return html.join("")
  }

  const html = genResultsHtml()
  const resultsbody = $("#resultsbody")
  resultsbody.html(html)
  applyFocus()
  gotoFocus()
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
  const { resultsByType } = state
  if (resultsByType == null) {
    return null
  }
  const { layers, texts, iPositions, ntypes } = corpus
  const { jobState: { showLayers } = {} } = state

  const headFields = ["type"]
  const nodeFields = new Map()

  for (let i = 0; i < ntypes.length; i++) {
    const nType = ntypes[i]
    const { [nType]: { matches, nodes } } = resultsByType

    if (nodes == null) {
      continue
    }

    const { [nType]: tpLayerInfo } = layers
    const { [nType]: tpTexts } = texts
    const { [nType]: tpIPositions } = iPositions
    const { [nType]: tpLayers = {} } = showLayers

    const exportLayers = tpLayers
      ? Object.entries(tpLayers)
          .filter(x => x[1])
          .map(x => x[0])
      : []
    for (const node of nodes) {
      if (!nodeFields.has(node)) {
        nodeFields.set(node, new Map())
      }
      const fields = nodeFields.get(node)
      fields.set("type", nType)
    }
    for (const layer of exportLayers) {
      const tpLayer = `${nType}-${layer}`
      headFields.push(tpLayer)

      const { [layer]: { pos: posKey } } = tpLayerInfo
      const { [layer]: text } = tpTexts
      const { [posKey]: iPos } = tpIPositions
      const { [layer]: lrMatches } = matches

      for (const node of nodes) {
        const fields = nodeFields.get(node)
        fields.set("type", nType)

        const nodeIPositions = iPos.get(node)
        const nodeMatches =
          lrMatches == null || !lrMatches.has(node)
            ? new Set()
            : lrMatches.get(node)
        const spans = getHLText(nodeIPositions, nodeMatches, text)

        let piece = ""
        for (const [hl, val] of spans) {
          piece += `${hl ? "«" : ""}${val}${hl ? "»" : ""}`
        }
        fields.set(tpLayer, piece)
      }
    }
  }

  const headLine = `node\t${headFields.join("\t")}\n`
  const lines = [headLine]

  for (let i = 0; i < ntypes.length; i++) {
    const nType = ntypes[i]
    const { [nType]: { nodes } } = resultsByType
    if (nodes == null) {
      continue
    }

    const sortedNodes = [...nodes].sort()

    for (const node of sortedNodes) {
      const thisLine = [`${node}`]
      const fields = nodeFields.has(node) ? nodeFields.get(node) : new Map()

      for (const headField of headFields) {
        thisLine.push(fields.has(headField) ? fields.get(headField) : "")
      }
      lines.push(`${thisLine.join("\t")}\n`)
    }
  }

  return lines
}

/* JOB CONTROL
 *
 * Jobs correspond to search sessions. The current job lives in the state,
 * as a member called "jobState".
 *
 * The user can make new jobs, duplicate them, rename them, delete them, switch
 * between them, save them to disk, load them from disk.
 *
 * All jobs that the apps loads, will be saved in localStorage.
 * Each action that changes the jobState, triggers a save action into
 * localStorage.
 */

/* Starting
 *
 * When we start up we look in localStorage for the last job.
 * If we find that, we load its data into the jobState part of the state.
 *
 * If not, we derive an initial jobState from the corpus, and load that
 * into the state
 */

const initJob = () => {
  /* lookup last job from local storage, if any, or else use init settings from corpus
   * initialize all job controls
   */
  const found = rememberLastJob()
  if (!found) {
    startJob()
  }
  applyJob(found)
}

const startJob = () => {
  /* Derive an initial jobState from the corpus
   */
  const jobchange = $("#jchange")
  const query = {}
  const { ntypes, layers, by: givenContainerType, show } = corpus

  const showLayers = {}
  let containerType

  for (const [nType, typeInfo] of Object.entries(layers)) {
    const { [nType]: showByType = {} } = show
    query[nType] = {}
    showLayers[nType] = {}

    for (const layer of Object.keys(typeInfo)) {
      const { [layer]: { value = "" } = {} } = typeInfo
      const { [layer]: thisShow } = showByType

      query[nType][layer] = DEBUG ? value : ""

      showLayers[nType][layer] = thisShow
    }
  }

  for (const nType of ntypes) {
    const { [nType]: thisBy } = givenContainerType
    if (thisBy) {
      containerType = nType
    }
  }
  if (!containerType) {
    containerType = defaultContainerType()
  }

  const focusPos = null
  const prevFocusPos = null
  const jobState = { query, containerType, showLayers, focusPos, prevFocusPos }
  stateUpdate({ jobState })
  memorizeThisJob()
  jobOptions(jobchange)
}

/* Activating job controls
 *
 * We could also move this to the ACTIVATE department, but we keep it here
 * because the top-level actions for job control are triggered here.
 */

const activateJobs = () => {
  /* make all job controls active
   */
  const jobnew = $("#newj")
  const jobdup = $("#dupj")
  const jobrename = $("#renamej")
  const jobdelete = $("#deletej")
  const jobchange = $("#jchange")

  jobnew.off("click").click(() => {
    /* make brand new job with no data, ask for new name
    */
    const newJob = suggestName(null)
    if (newJob == null) {
      return
    }
    makeJob(newJob)
    jobOptions(jobchange)
  })
  jobdup.off("click").click(() => {
    /* duplicate current job, ask for related new name
    */
    const { jobName } = state
    const newJob = suggestName(jobName)
    if (newJob == null) {
      return
    }
    copyJob(newJob)
    jobOptions(jobchange)
  })
  jobrename.off("click").click(() => {
    /* rename current job, ask for related new name
    */
    const { jobName } = state
    const newJob = suggestName(jobName)
    if (newJob == null) {
      return
    }
    renameJob(newJob)
    jobOptions(jobchange)
  })
  jobdelete.off("click").click(() => {
    /* delete current job
    */
    deleteJob()
    jobOptions(jobchange)
  })
  jobchange.change(e => {
    /* switch to another job
    */
    const { jobName } = state
    const newJob = e.target.value
    if (jobName == newJob) {
      return
    }
    switchJob(newJob)
  })

  /* populate the list of know options
  */
  jobOptions(jobchange)
}

const jobOptions = jobchange => {
  /* populate the options of the select box with the remembered jobs in localStorage
   */
  const { jobName } = state
  let html = ""
  for (const job of rememberedJobs()) {
    const selected = job == jobName ? " selected" : ""
    html += `<option value="${job}"${selected}>${job}</option>`
    jobchange.html(html)
  }
}

const suggestName = job => {
  /* ask for a new name for a job
   * Given job, we append an `N` until the name is
   * not one of the known jobs.
   * This is only a suggestion, the user may override it.
   */
  const jobs = new Set(rememberedJobs())
  let newName = job
  const resolved = s => s && s != job && !jobs.has(s)
  let cancelled = false
  while (!resolved(newName) && !cancelled) {
    while (!resolved(newName)) {
      if (newName == null) {
        newName = defaultJobName()
      } else {
        newName += "N"
      }
    }
    const answer = prompt("New job name:", newName)
    if (answer == null) {
      cancelled = true
    } else {
      newName = answer
    }
  }
  return cancelled ? null : newName
}

/* job actions as defined by controls on the interface
 *
 * All these actions have to take care of
 *
 * - updating the state
 * - applying the new state to the interface
 * - storing the new state in local storage
 */

const makeJob = newJob => {
  /* make a fresh job
   */
  let { jobName } = state
  if (jobName == newJob) {
    return
  }
  jobName = newJob
  stateUpdate({ jobName, jobState: {} })
  applyJob(false)
  memorizeThisJob()
}

const copyJob = newJob => {
  /* copy current job to a new name
   */
  let { jobName } = state
  if (jobName == newJob) {
    return
  }
  jobName = newJob
  stateUpdate({ jobName })
  applyJob(false)
  memorizeThisJob()
}

const renameJob = newJob => {
  /* rename current job
   */
  let { jobName } = state
  if (jobName == newJob) {
    return
  }
  forgetJob(jobName)
  jobName = newJob
  stateUpdate({ jobName })
  applyJob(false)
  memorizeThisJob()
}

const deleteJob = () => {
  /* delete current job
   * But only if there is still a job left,
   * otherwise rename to the default name
   */
  const { jobName } = state
  forgetJob(jobName)
  const allJobs = rememberedJobs()
  const newJob = allJobs.length ? allJobs[0] : defaultJobName()
  switchJob(newJob)
}

const switchJob = job => {
  /* switch to selected job
   */
  const found = rememberJob(job)
  applyJob(true)
  if (!found) {
    memorizeThisJob()
  } else {
    memorizeThisJobName()
  }
}

const importJob = (job, jobState) => {
  /* import a job, where the name and jobState are given
  */
  const jobName = job || defaultJobName()
  stateUpdate({ jobName, jobState })
  applyJob(true)
  memorizeThisJob()
  const jobchange = $("#jchange")
  jobOptions(jobchange)
}

const saveJob = () => {
  /* save current job state to file
   * The file will be offered to the user as a download
   */
  const { jobName, jobState } = state
  const text = JSON.stringify(jobState)
  download(text, jobName, "json", false)
}

/* FILE MANAGEMENT
 *
 * We cannot read from files and write to files directly from a browser script.
 *
 * When we want to read, we ask the user to point to a file,
 * and we "upload" that file
 * When we want to write, we offer a download to the user.
 */

/* reading */

const importFile = elem => {
  /* Reads the content of a file
   * Elem should be an <input type="file"> element
   * for which the user has selected a file already
   */
  const { files } = elem
  if (!files.length) {
    alert("No file selected")
  } else {
    for (const file of files) {
      const reader = new FileReader()
      const job = file.name.match(/([^/]+)\.[^.]*$/)[1]
      reader.onload = e => {
        const jobState = JSON.parse(e.target.result)
        importJob(job, jobState)
      }
      reader.readAsText(file)
    }
  }
}

/* writing */

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

    blob = new Blob(
      [new Uint8Array(byteArray)], { type: "text/plain;charset=UTF-16LE;" }
    )
  } else {
    blob = new Blob([text], { type: "text/plain;charset=UTF-8;" })
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `${fileName}.${ext}`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/* LOCAL STORAGE MANAGEMENT
 *
 * When we store/retrieve keys in localStorage,
 * we always prepend a prefix to the key:
 * - a fixed part, marking that it is a layered search app
 * - a corpus dependent part: the name of the corpus
 *
 * localStorage for file:// urls is not clearly defined.
 * If several apps like this are being used in the same browser,
 * this practice will prevent collisions
 */

/* key massaging */

const IF_NAME = "ls"
const LAST_JOB_KEY = `${IF_NAME}LastJob`
const defaultJobName = () => `${corpus.name}-search`
const getJobPrefix = () => `${IF_NAME}/${corpus.name}/`
const getJobKey = job => `${getJobPrefix()}${job}`

/* writing */

const memorizeJobName = job => {
  /* We store a special key in local storage that contains
   * the key of the last job that the user has worked with.
   * Here we commit a name of a job to localStorage as last job.
   */
  localStorage.setItem(LAST_JOB_KEY, job)
}

const memorizeThisJobName = () => {
  /* Here we commit a name of the current job to localStorage as last job.
  */
  const { jobName } = state
  localStorage.setItem(LAST_JOB_KEY, jobName)
}

const memorizeThisJob = () => {
  /* store current job in localStorage and mark it as last job
   */
  const { jobName, jobState } = state
  const jobKey = getJobKey(jobName)
  localStorage.setItem(jobKey, JSON.stringify(jobState))
  memorizeThisJobName()
}

/* reading */

const rememberLastJobName = () => localStorage.getItem(LAST_JOB_KEY)

const rememberJob = job => {
  /* retrieve data for specified job from localStorage
   */
  const jobName = job || defaultJobName()
  const jobKey = getJobKey(jobName)
  const jobContent = localStorage.getItem(jobKey)
  const jobState = jobContent ? JSON.parse(jobContent) : {}
  stateUpdate({ jobName, jobState })
  return !!jobContent
}

const rememberLastJob = () => {
  /* retrieve last job and its data from local storage
   */
  const job = rememberLastJobName()
  return rememberJob(job)
}

const rememberedJobs = () => {
  /* retrieve all job names from localStorage
   */
  const lsPrefix = getJobPrefix()
  const lsLength = lsPrefix.length
  const jobs = Object.keys(localStorage)
    .filter(key => key.startsWith(lsPrefix))
    .map(key => key.substring(lsLength))
  jobs.sort()
  return jobs
}

/* deleting */

const forgetJob = job => {
  /* delete specified job from localStorage
   *
   * If we delete the current job, we remove its data
   * and set the last used job name to the default job name
   */
  const jobKey = getJobKey(job)
  localStorage.removeItem(jobKey)
  if (rememberLastJobName() == job) {
    memorizeJobName(defaultJobName())
  }
}

/* MAIN CONTROL
 * We take care to use an async function for the longish
 * initialization, so that we can display progress messages
 * in the mean time
 */

const init = async () => {
  const pbox = $("#progress")
  dressUp()
  warmUpData()
  addWidgets()
  activateContainerType()
  activateShow()
  activateSearch()
  activateNumberControl()
  activateJobs()
  activateImport()
  activateExport()
  initJob()
  clearProgress(pbox)
}

$(() => {
  const pbox = $("#progress")
  clearProgress(pbox)
  showProgress(pbox, "Javascript has kicked in.")
  showProgress(pbox, "Initializing ...")
  init()
})
