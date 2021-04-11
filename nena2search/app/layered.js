/*eslint-env jquery*/

/* global config */
/* global corpus */

const DEBUG = false

/* CONSTANTS */

const BOOL = "boolean"
const NUMBER = "number"
const STRING = "string"
const OBJECT = "object"

const QUWINDOW = 10
const MAXINPUT = 1000

const NODESEQTEXT = { on: "nodes start at 1", off: "nodes as in TF" }
const EXPANDTEXT = {
  on: "- active layers",
  off: "+ all layers",
  no: "no layers",
}
const UNITTEXT = { r: "row unit", a: "context", d: "content" }
const EXECTEXT = { on: "⚫️", off: "🔴" }
const VISIBLETEXT = { on: "🔵", off: "⚪️" }

const FLAGSDEFAULT = { i: true, m: true, s: false }

const SEARCH = {
  dirty: "fetch results",
  exe: "fetching ...",
  done: "up to date",
}
const TIP = {
  nodeseq: `node numbers start at 1 for each node types
OR
node numbers are exactly as in Text Fabric`,
  expand: "whether to show inactive layers",
  unit: "make this the row unit",
  exec: "whether this pattern is used in the search",
  visible: "whether this layer is visible in the results",
  visibletp: "whether node numbers are visible in the results",
  flagm: `multiline: ^ and $ match:
ON: around newlines
OFF: at start and end of whole text`,
  flags: `single string: . matches all characters:
ON: including newlines
OFF: excluding newlines"`,
  flagi: `ignore
ON: case-insensitive
OFF: case-sensitive"`,
}


/* INFORMATIONAL MESSAGES
 *
 * Progress and debug messages
 */

const tell = msg => {
  /* issue a debug message to the console
   * Only if the DEBUG flag is true
  */
  if (DEBUG) {
    console.log("DEBUG", msg)
  }
}
tell("!!! IS ON !!!")

const progress = msg => {
  /* issue a debug message to the console
  */
  console.log(msg)
}

const error = msg => {
  /* issue a error message to the console
  */
  console.error(msg)
}

const drawError = (box, ebox, msg) => {
  /* Draw an error on the interface
   * The error is drawn in element ebox,
   * and the element box receives error formatting
   */
  console.error(msg)
  box.addClass("error")
  ebox.show()
  ebox.html(msg)
}

const clearError = (box, ebox) => {
  /* Clear error formatting in specified locations
   * See drawError
   */
  box.removeClass("error")
  ebox.html("")
  ebox.hide()
}

const drawProgress = (box, msg) => {
  /* Draw a progress message on the interface
   * The message is drawn in element box
   */
  box.append(`${msg}<br>`)
}

const clearProgress = pbox => {
  /* Clear progress messages in specified location
   * See drawProgress
  */
  pbox.html("")
}

/* THE CORPUS
 *
 * The fixed corpus data is in the global vars corpus and config,
 * coming from config.js and corpus.js resp.
 * Config contains small data: defaults, settings, descriptions.
 * Corpus contains the big data: texts, positions, the parent relation "up".
 *
 * Config is imported and computed before this script.
 * The page can then render without waiting for the big corpus data file,
 * which is imported after this script.
 */

const { simpleBase } = config
/* This is the base type of the corpus, e.g. word or letter
*/

const normalContainerType = () => {
  /* pick the normal container type as specified by the corpus
   * If the corpus has forgotten to specify one,
   * pick a reasonable one out of the available types of the corpus.
   * See defaultContainerType()
  */
  const { containerType } = config

  return containerType || defaultContainerType
}

const defaultContainerType = () => {
  /* If no normal container type has been given in the corpus,
   * define one: take a type in the middle of all node types
   */
  const { ntypes } = config
  const pos = Math.round(ntypes.length / 2)
  return ntypes[pos]
}


const warmUpConfig = () => {
  /* Derive additional parts of the config data
  */
  const { ntypes } = config
  config.ntypesR = [...ntypes]
  config.ntypesR.reverse()
  const ntypesI = new Map()
  for (let i = 0; i < ntypes.length; i++) {
    ntypesI.set(ntypes[i], i)
  }
  config.ntypesI = ntypesI
}

const warmUpData = () => {
  /* Expand parts of the corpus data that have been optimized before shipping
  */
  progress(`Decompress up-relation and infer down-relation`)
  decompress()
  progress(`Infer inverted position maps`)
  invertPositionMaps()
  progress(`Done`)
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

  for (const [nType, tpInfo] of Object.entries(positions)) {
    for (const [layer, pos] of Object.entries(tpInfo)) {
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
 *   2. the jobState (button clicks and text entered into text fields)
 *   3. the jobName (a job contains the essential information
 *      to recreate a search session)
 *
 * As to 1: the following members are present
 *   1a. tpResults: for each node type:
 *       1a1. (nodes) the set of nodes that match the query
 *            (they match all layers of this node type, and when you
 *            project the nodes to other node types, they match all layers
 *            of those types as well)
 *       1a2. (matches) for each layer of this type the mapping from nodes
 *            to matched character positions
 *  1b. resultsComposed: an array of results; when a composeType is chosen,
 *      we generate the results from tpResults and store them here.
 *      A result consists of a node of the containerType, plus its
 *      ancestor nodes from higher types, plus all of its descendent nodes
 *      in lower types. A result only contains the nodes, not yet actual
 *      matched text.
 *      In order to render the results table, we need both tpResults and
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
 *         i.e. a regex, and its flags (i m s), and whether it is will be/is executed
 *     2b. dirty: whether the results in the state are out of sync with the query
 *         in the state.
 *         This becomes true when a user edits the search patterns but has not yet
 *         executed the new query
 *     2c. expandTypes: whether the layers of the types are expanded.
 *         Not expanded means: only the active layers are visible.
 *         A layer is active if it has a non-empty pattern or if its visible flag
 *         is set or both
 *     2c. containerType: the node type used for composing results
 *     2d. visibleLayers: for each node type and each layer in that type,
 *         whether that layer must be visible in the results
 *     2e. focusPos: the current position in the table of results: this is what is drawn
 *         in the middle of the screen if possible, together with a number of rows above
 *         and below, given by QUWINDOW.
 *         The focused result will be marked strongly on the interface.
 *     2f. prevFocusPos: the previous focusPos.
 *         The result at this position will be marked lightly.
 *
 * As to 3: jobName is the name of the current search session, aka job.
 *   When we store a jobState in localStorage, we use this as key.
 *   When we store a jobState on file, we use this as file name.
 *
 * MUTABLE STATE
 *
 * Contrary React-Redux practice, our state is mutable.
 * We do not work with cycles that re-render the display after state changes,
 * so we do not need to detect state changes efficiently.
 * Instead, at each state change, we also update the interface.
 *
 * STATE PROVIDER OBJECT
 *
 * The state logic is encapsulated in a class which is instantiated
 * with one object, the State
 *
 * INITIAL STATE
 *
 * The jobState part of the state is fixed in shape.
 * The State Provider furnish a jobState that has * all members and submembers present,
 * filled with default values, none of which are missing or null.
 *
 * The jobState can be initialized from external, incoming data,
 * use State.startj for that.
 *
 * SAFE MERGE
 *
 * The jobState may come from untrusted sources, such as an imported file
 * of localStorage. Such a jobState may not conform to the shape of the jobState
 * as prescribed here.
 * So the State Provider performs a safe merge of the new jobState into a
 * fresh initial job state.
 * A safe merge copies leaf members of the incoming state into corresponding places
 * in the initial state, provided the path in the incoming state exists in the initial
 * state, and the type of the value in the incoming state is the same as that of
 * the corresponding value in the initial state, and the incoming value is not null.
 * If the type of the value is string, the value should be less than MAXINPUT.
 *
 * If any of these conditions are not met, the update of that value is skipped.
 * An error message will be written to the console .
 *
 * GETTING the state
 *
 * Always by State.gets() or State.getj()
 *
 * gets is for top level state slices except jobState
 * sets gets the jobState slice as a deep copy (so you cannot modify the jobState)
 *
 * const { query: { [nType]: { [layer]: pattern } } } = State.getj()
 *
 * N.B. We do not have to take care to use default values ( = {} ) for intermediate
 * subobjects, because the members of the jobState are guaranteed to exist.
 *
 * SETTING the state
 *
 * ALWAYS by State.sets() or State.setj()
 *
 * We get the members of state object back (except jobState).
 * This enables patterns where we set a state member
 * and then use that value in a local variable:
 *
 * const { tpResults } = State.sets({ tpResults: {} })
 *
 * Note that setj() does not return data!
 *
 * When setting the jobState with setj(),
 * we apply the same checks as when we start a job from external data.
 *
 * INVARIANT:
 *
 * The jobState always has the full prescribed shape, with all members present at any
 * level, and with now leaf values null.
 *
 * */

class StateProvider {
  /* private members */

  constructor() {
    /* Make the contents for an initial, valid state, with defaults filled in
    */
    this.state = {
      tpResults: null,
      resultsComposed: null,
      resultTypeMap: null,
      jobName: null,
      jobState: this.initjslice(),
    }
  }

  handleCheck() {
    progress("x")
  }

  initjslice() {
    /* Make the contents for an initial, valid jobState, with defaults filled in
     * This is the first step in guaranteeing that the jobState has a fixed shape.
     */
    const { ntypes, layers, visible } = config

    // First set a dumb, superficial value
    const jobState = {
      settings: { nodeseq: true },
      query: {},
      dirty: false,
      expandTypes: {},
      containerType: normalContainerType(),
      visibleLayers: {},
      focusPos: -2,
      prevFocusPos: -2,
    }

    // Now create deeper values, from corpus config defaults
    const { query, expandTypes, visibleLayers } = jobState

    for (const nType of ntypes) {
      const { [nType]: tpInfo = {} } = layers
      const { [nType]: tpVisible = {} } = visible

      query[nType] = {}
      expandTypes[nType] = false
      visibleLayers[nType] = { _: false }

      for (const layer of Object.keys(tpInfo)) {
        const { [layer]: { value = "" } = {} } = tpInfo
        const { [layer]: lrVisible = false } = tpVisible

        query[nType][layer] = {
          pattern: DEBUG ? value : "",
          flags: { ...FLAGSDEFAULT },
          exec: true,
        }
        visibleLayers[nType][layer] = lrVisible
      }
    }
    return jobState
  }
  startjslice(incoming) {
    /* create a starting jobState out of an incoming jobState,
     * which is safely merged into an initial jobState
     */
    const freshJobState = this.initjslice()
    merge(freshJobState, incoming, [])
    this.state.jobState = freshJobState
  }

  /* public members */

  gets() {
    /* GET STATE
     *
     * returns a shallow copy of the state, but only with the non jobState
     * members.
     * Note that the caller cannot use this to change the members
     * that are string or number.
     * But he can change the contents of the members that hold an object as value.
     * This is intentional.
     */
    const { state: { jobState, ...rest } } = this
    return rest
  }

  sets(incoming) {
    /* SET STATE
     *
     * update the state by means of an object data containing the updates
     * The structure of the updates reflects the structure of a (part of) the state,
     * only at top-level.
     */
    const { state } = this

    for (const [inKey, inValue] of Object.entries(incoming)) {
      const stateVal = state[inKey]
      if (stateVal === undefined) {
        error(`State update: unknown key ${inKey}`)
        continue
      }
      state[inKey] = inValue
    }
    return this.gets()
  }

  startj(job, incoming) {
    /* INIT JOB STATE
     *
     * updates the state for a new, named job with incoming data
     */
    const jobName = job || defaultJobName()
    this.state.jobName = jobName
    State.startjslice(incoming)
  }

  getj() {
    /* GET JOB STATE
     *
     * returns the jobState
     * The caller should not modify the job state, so we return a deep copy of it
     */
    const { state: { jobState } } = this
    return JSON.parse(JSON.stringify(jobState))
  }

  setj(incoming) {
    /* SET JOB STATE
     *
     * Performs a safe update of the jobState by incoming data
     */
    const { state: { jobState } } = this
    merge(jobState, incoming, [])
  }
}

/* THE STATE OBJECT */

let State

/* auxiliary functions for state operations */

const isObject = v => typeof v === OBJECT && !Array.isArray(v)

const merge = (orig, incoming, path) => {
  /* Merge an incoming object safely into an original object.
   * The shape of orig will not be altered
   *  1. no new keys will be introduced at any level
   *  2. no value becomes undefined or null
   *  3. no value changes type
   *  4. no value becomes too long
   *
   * For all violations, an error message is sent to the console .
   *
   * Invariant: orig is an object, not a leaf value
   */

  const pRep = `Merge: incoming at path "${path.join(".")}": `

  if (incoming == null) {
    error(`${pRep}undefined`)
    return
  }
  if (!isObject(incoming)) {
    error(`${pRep}non-object`)
    return
  }
  for (const [inKey, inValue] of Object.entries(incoming)) {
    const origValue = orig[inKey]
    if (origValue === undefined) {
      error(`${pRep}unknown key ${inKey}`)
      continue
    }
    if (inValue == null) {
      error(`${pRep}undefined value for ${inKey}`)
      continue
    }
    const origType = typeof origValue
    const inType = typeof inValue
    if (origType === NUMBER || origType === STRING || origType === BOOL) {
      if (inType === OBJECT) {
        const repVal = JSON.stringify(inValue)
        error(`${pRep}object ${repVal} for ${inKey} instead of leaf value`)
        continue
      }
      if (inType != origType) {
        error(`${pRep}type conflict ${inType}, expected ${origType} for ${inKey}`)
        continue
      }
      if (inType === STRING && inValue.length > MAXINPUT) {
        const eRep = `${inValue.length} (${inValue.substr(0, 20)} ...)`
        error(`${pRep}maximum length exceeded for ${inKey}: ${eRep}`)
        continue
      }
      // all is well, we replace the value in orig by the incoming value
      orig[inKey] = inValue
      continue
    }
    if (origType !== OBJECT) {
        error(`${pRep}unknown type ${inType} for ${inKey}=${inValue} instead of object`)
        continue
    }
    if (origType === OBJECT) {
      if (inType !== OBJECT) {
        error(`${pRep}leaf value {inValue} for {inKey} instead of object`)
        continue
      }
      merge(origValue, inValue, [...path, inKey])
    }
  }
}

/* APPLY STATE TO INTERFACE
 *
 * We can apply part of the state to the interface.
 */

const applyJob = run => {
  /* apply jobState to the interface
   */
  const { ntypes, layers } = config

  const { jobName } = State.gets()
  const { query, containerType, visibleLayers } = State.getj()

  applySettings("nodeseq")

  $("#jobname").val(jobName)
  $("#jchange").val(jobName)

  for (const nType of ntypes) {
    const { [nType]: tpInfo = {} } = layers
    const { [nType]: tpQuery } = query
    const { [nType]: tpVisibleLayers } = visibleLayers

    applyLayers(nType)

    const { _: visibleNodes } = tpVisibleLayers
    setButton("visible", `[ntype="${nType}"][layer="_"]`, visibleNodes, VISIBLETEXT)

    for (const layer of Object.keys(tpInfo)) {
      const { [layer]: { pattern = "", flags = {}, exec = true } = {} } = tpQuery
      const box = $(`[kind="pattern"][ntype="${nType}"][layer="${layer}"]`)
      box.val(pattern)

      const useFlags = { ...FLAGSDEFAULT, ...flags }
      for (const [flag, isOn] of Object.entries(useFlags)) {
        setButton(flag, `[ntype="${nType}"][layer="${layer}"]`, isOn)
      }

      setButton("exec", `[ntype="${nType}"][layer="${layer}"]`, exec, EXECTEXT)

      const { [layer]: visible = false } = tpVisibleLayers
      setButton("visible", `[ntype="${nType}"][layer="${layer}"]`, visible, VISIBLETEXT)
    }
  }

  applyUnits(containerType)
  applyResults(run)
  clearBrowserState()
}

const applySettings = name => {
  const { settings: { [name]: value } } = State.getj()
  setButton(name, "", value, NODESEQTEXT)

  if (name == "nodeseq") {
    displayResults()
  }
}

const applyLayers = nType => {
  const { layers: { [nType]: tpLayers = {} } = {} } = config
  const {
    expandTypes: { [nType]: expand },
    visibleLayers: { [nType]: tpVisible },
    query: { [nType]: tpQuery },
  } = State.getj()

  const totalLayers = Object.keys(tpLayers).length
  const useExpand = (totalLayers == 0) ? null : expand

  let totalActive = 0

  for (const layer of Object.keys(tpLayers)) {
    const row = $(`.ltype[ntype="${nType}"][layer="${layer}"]`)
    const { [layer]: { pattern } } = tpQuery
    const { [layer]: visible } = tpVisible
    const isActive = visible || pattern.length > 0

    if (isActive) {
      totalActive += 1
    }
    if (expand || isActive) {
      row.show()
    }
    else {
      row.hide()
    }
  }
  const text = {
    no: EXPANDTEXT.no,
    on: `${EXPANDTEXT.on}(${totalActive})`,
    off: `${EXPANDTEXT.off}(${totalLayers})`,
  }
  setButton("expand", `[ntype="${nType}"]`, useExpand, text)
}

const applyUnits = containerType => {
  /* update the tags on the buttons for the containerType selection
   * Only one of them can be on, they are function-wise radio buttons
   */
  const { ntypes, ntypesI } = config

  const containerIndex = ntypesI.get(containerType)
  for (const nType of ntypes) {
    const nTypeIndex = ntypesI.get(nType)
    const k = (containerIndex == nTypeIndex)
      ? "r" : (containerIndex < nTypeIndex)
      ? "a" : "d"
    const elem = $(`button[name="ctype"][ntype="${nType}"]`)
    elem.html(UNITTEXT[k])
  }
  setButton("ctype", ``, false)
  setButton("ctype", `[ntype="${containerType}"]`, true)
}

const clearBrowserState = () => {
  /* clears the browser state after a change in the form fields.
   * this prevents an "are you sure" - popup before reloading the page
   */
  if (window.history.replaceState) {
    window.history.replaceState(null, null, window.location.href)
  }
}

const setButton = (name, spec, onoff, changeTag) => {
  /* Put a button in an on or off state
   * name is what is in their "name" attribute,
   * with spec you can pass additional selection criteria,
   * as a jQuery selector
   * onoff is true or false: true will add the class on, false will remove that class
   */
  const elem = $(`button[name="${name}"]${spec}`)
  if (onoff == null) {
    elem.removeClass("on")
    elem.addClass("no")
  }
  else {
    if (onoff) {
      elem.addClass("on")
      elem.removeClass("no")
    }
    else {
      elem.removeClass("on")
      elem.removeClass("no")
    }
  }
  if (changeTag) {
    elem.html(changeTag[(onoff == null) ? "no" : onoff ? "on" : "off"])
  }
}

const applyResults = run => {
  /* fill in the results of a job
   * Only needed when a new job has been loaded (specified by run=true).
   * If so, and if the query in the job is not dirty,
   * we run the query and display the results.
   * If the query is dirty, we clear all result components in the state.
   */
  const { dirty } = State.getj()
  if (run) {
    if (dirty) {
      const statsbody = $("#statsbody")
      const resultsbody = $("#resultsbody")

      statsbody.html("")
      resultsbody.html("")
      applyFocus()

      State.sets({ tpResults: null, resultsComposed: null, resultTypeMap: null })
      State.setj({ prevFocusPos: -2, dirty: false })
    } else {
      animate(runQuery)()
    }
  }
}

const applyFocus = () => {
  /* adjust the interface to the current focus
   * Especially the result navigation controls and the slider
  */
  const { resultsComposed } = State.gets()
  const { focusPos } = State.getj()
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
  const focusVal = focusPos == -2 ? 0 : focusPos + 1
  const totalVal = focusPos == -2 ? 0 : nResults
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

  if (focusPos != -2) {
    setterw.show()
    totalw.show()
    if (nResults > 2 * QUWINDOW) {
      sliderw.show()
    }
    if (focusPos < nResults - 1) {
      maxa.addClass("active")
      maxp.addClass("active")
    }
    if (focusPos + QUWINDOW < nResults - 1) {
      max2p.addClass("active")
    }
    if (focusPos > 0) {
      mina.addClass("active")
      minp.addClass("active")
    }
    if (focusPos - QUWINDOW > 0) {
      min2p.addClass("active")
    }
  }
}

const gotoFocus = () => {
  /* scrolls the interface to the result that is in focus
   */
  const rTarget = $(`.focus`)
  if (rTarget != null && rTarget[0] != null) {
    rTarget[0].scrollIntoView({ block: "center", behavior: "smooth" })
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
  const { description, captions: { title } } = config
  $("head>title").html(title)
  $("#title").html(title)
  $("#description").html(description)
  $("go").html(SEARCH.dirty)
}

const addWidgets = () => {
  /* Generate all search controls
   * and put them on the interface
   */
  const querybody = $("#querybody")
  const { ntypesR, layers, levels } = config
  const html = []

  for (const nType of ntypesR) {
    const tpInfo = layers[nType] || {}
    const description = levels[nType] || {}
    html.push(genTypeWidgets(nType, description, tpInfo))
  }
  querybody.html(html.join(""))
}

const genTypeWidgets = (nType, description, tpInfo) => {
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
<tr class="qtype" ntype="${nType}">
  <td class="lvcell">${nTypeRep}</td>
  <td><button type="button" name="expand" class="expand"
    ntype="${nType}"
    title="${TIP.expand}"
  ></button></td>
  <td><button type="button" name="ctype" class="unit"
    ntype="${nType}"
    title="${TIP.unit}"
  >result</button></td>
  <td></td>
  <td><button type="button" name="visible" class="visible"
    ntype="${nType}" layer="_"
    title="${TIP.visibletp}"
  ></button></td>
</tr>
`)

  for (const [layer, lrInfo] of Object.entries(tpInfo)) {
    html.push(genWidget(nType, layer, lrInfo))
  }
  return html.join("")
}

const genWidget = (nType, layer, lrInfo) =>
  /* Generate html for the search controls for a single layer
   */
  `
<tr class="ltype" ntype="${nType}" layer="${layer}">
  <td>${genLegend(nType, layer, lrInfo)}</td>
  <td>
    /<input type="text" kind="pattern" class="pattern"
      ntype="${nType}" layer="${layer}"
      maxlength="${MAXINPUT}"
      value=""
    ><span kind="error" class="error"
      ntype="${nType}" layer="${layer}"
    ></span>/</td>
  <td><button type="button" name="i" class="flags"
      ntype="${nType}" layer="${layer}"
      title="${TIP.flagi}"
    >i</button><button type="button" name="m" class="flags"
      ntype="${nType}" layer="${layer}"
      title="${TIP.flagm}"
    >m</button><button type="button" name="s" class="flags"
      ntype="${nType}" layer="${layer}"
      title="${TIP.flags}"
    >s</button>
  </td>
  <td><button type="button" name="exec" class="exec"
    ntype="${nType}" layer="${layer}"
    title="${TIP.exec}"
  ></button></td>
  <td><button type="button" name="visible" class="visible"
    ntype="${nType}" layer="${layer}"
    title="${TIP.visible}"
  ></button></td>
</tr>
`

const genLegend = (nType, layer, lrInfo) => {
  /* Generate html for the description / legend of a single layer
   */
  const { valueMap, description } = lrInfo
  const html = []

  if (valueMap || description) {
    html.push(`
<details>
  <summary class="lyr">${layer}</summary>
`)
    if (description) {
      html.push(`<div>${description}</div>`)
    }
    if (valueMap) {
      for (const [acro, full] of Object.entries(valueMap)) {
        html.push(`
<div class="legend">
  <b><code>${acro}</code></b> =
  <i><code>${full}</code></i>
</div>`
        )
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

/* LONG RUNNING FUNCTIONS
 *
 * We apply a device to make behaviour more conspicuous on the interface.
 *
 * There are two problems
 *
 * 1. some actions go so fast, that the user does not see them happening
 * 2. some actions take a lot of time, without the user knowing that he must wait
 *
 * To solve that, we apply some CSS transitions to background and border colors.
 * In order to trigger them, we wrap some functions into this sequence:
 *
 * a. add the CSS class "waiting" to some elements
 * b. run the function in question
 * c. remove the CSS class "waiting" from thiose elements.
 *
 * However, when we implement this straightforwardly and synchronously,
 * we do not see any effect, because the browser does not take the trouble
 * to re-render during this sequence.
 *
 * So we need an asynchronous wrapper, and here is what happens:
 *
 * a. add the CSS class "waiting"
 * b. sleep for a fraction of a second
 * c. -- now the browser renders the interface and you see the effect of "waiting"
 * d. run the function in question
 * e. remove the CSS class "waiting"
 * f. -- when the sequence is done, the browser renders again, and you see the
 *       effect of "waiting" gone
 */

const animate = func => async () => {
  const output = $(`#resultsbody,#resultshead`)
  const go = $("#go")
  const expr = $("#exportr")

  progress(`executing ${func.name}`)
  go.html(SEARCH.exe)
  go.removeClass("dirty")
  go.addClass("waiting")
  output.addClass("waiting")
  await sleep(0.05)
  func()
  go.html(SEARCH.done)
  expr.addClass("active")
  output.removeClass("waiting")
  go.removeClass("waiting")
  $(".dirty").removeClass("dirty")
  progress(`done ${func.name}`)
}

const makeDirty = elem => {
  const go = $("#go")
  const expr = $("#exportr")
  elem.addClass("dirty")
  go.addClass("dirty")
  go.html(SEARCH.dirty)
  expr.removeClass("active")
  State.setj({ dirty: true })
}

const activateSearch = () => {
  /* make the search button active
   */
  const go = $(`#go`)

  const handleQuery = e => {
    e.preventDefault()
    go.off("click")
    animate(runQuery)()
    State.setj({ dirty: false })
    memorizeThisJob()
    clearBrowserState()
    go.click(handleQuery)
  }

  go.off("click").click(handleQuery)
  /* handle changes in the expansion of layers
   */

  const settingctls = $("#settings>button")
  settingctls.off("click").click(e => {
    e.preventDefault()
    const elem = $(e.target)
    const name = elem.attr("name")
    const isNo = elem.hasClass("no")
    if (!isNo) {
      const isOn = elem.hasClass("on")
      State.setj({ settings: { [name]: !isOn } })
      applySettings(name)
      memorizeThisJob()
    }
    clearBrowserState()
  })

  const expands = $(`button[name="expand"]`)
  expands.off("click").click(e => {
    e.preventDefault()
    const elem = $(e.target)
    const nType = elem.attr("ntype")
    const isNo = elem.hasClass("no")
    if (!isNo) {
      const isOn = elem.hasClass("on")
      State.setj({ expandTypes: { [nType]: !isOn } })
      applyLayers(nType)
      memorizeThisJob()
    }
    clearBrowserState()
  })
  /* handle changes in the container type
   */
  const units = $(`button[name="ctype"]`)
  units.off("click").click(e => {
    e.preventDefault()
    const elem = $(e.target)
    const nType = elem.attr("ntype")
    const { containerType } = State.getj()
    if (nType == containerType) {
      return
    }
    State.setj({ containerType: nType })
    composeResults(true)
    displayResults()
    applyUnits(nType)
    memorizeThisJob()
    clearBrowserState()
  })
  /* handle changes in the search patterns
   */
  const patterns = $(`input[kind="pattern"]`)
  patterns.off("change").change(e => {
    const elem = $(e.target)
    const nType = elem.attr("ntype")
    const layer = elem.attr("layer")
    const { target: { value } } = e
    makeDirty(elem)
    State.setj({ query: { [nType]: { [layer]: { pattern: value } } } })
    memorizeThisJob()
    clearBrowserState()
  })
  const errors = $(`[kind="error"]`)
  errors.hide()
  /* handle changes in the regexp flags
   */
  const flags = $(`button.flags`)
  flags.off("click").click(e => {
    e.preventDefault()
    const elem = $(e.target)
    const name = elem.attr("name")
    const nType = elem.attr("ntype")
    const layer = elem.attr("layer")
    const isOn = elem.hasClass("on")
    makeDirty(elem)
    State.setj({ query: { [nType]: { [layer]: { flags: { [name]: !isOn } } } } })
    setButton(name, `[ntype="${nType}"][layer="${layer}"]`, !isOn)
    memorizeThisJob()
    clearBrowserState()
  })
  /* handles changes in the "exec" controls
   */
  const execs = $(`button.exec`)
  execs.off("click").click(e => {
    e.preventDefault()
    const elem = $(e.target)
    const nType = elem.attr("ntype")
    const layer = elem.attr("layer")
    const isOn = elem.hasClass("on")
    makeDirty(elem)
    State.setj({ query: { [nType]: { [layer]: { exec: !isOn } } } })
    setButton("exec", `[ntype="${nType}"][layer="${layer}"]`, !isOn, EXECTEXT)
    memorizeThisJob()
    clearBrowserState()
  })
  /* handles changes in the "visible" controls
   */
  const visibles = $(`button.visible`)
  visibles.off("click").click(e => {
    e.preventDefault()
    const elem = $(e.target)
    const nType = elem.attr("ntype")
    const layer = elem.attr("layer")
    const isOn = elem.hasClass("on")
    State.setj({ visibleLayers: { [nType]: { [layer]: !isOn } } })
    setButton("visible", `[ntype="${nType}"][layer="${layer}"]`, !isOn, VISIBLETEXT)
    displayResults()
    memorizeThisJob()
    clearBrowserState()
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
    const { focusPos } = State.getj
    State.setj({ prevFocusPos: focusPos })
    State.setj({ focusPos: checkFocus(slider.val() - 1) })
    memorizeThisJob()
    displayResults()
  })
  setter.off("change").change(() => {
    const { focusPos } = State.getj
    State.setj({ prevFocusPos: focusPos })
    State.setj({ focusPos: checkFocus(setter.val() - 1) })
    memorizeThisJob()
    displayResults()
  })
  minp.off("click").click(() => {
    const { focusPos } = State.getj
    if (focusPos == null) {
      return
    }
    State.setj({ prevFocusPos: focusPos })
    State.setj({ focusPos: checkFocus(focusPos - 1) })
    memorizeThisJob()
    displayResults()
  })
  min2p.off("click").click(() => {
    const { focusPos } = State.getj
    if (focusPos == null) {
      return
    }
    State.setj({ prevFocusPos: focusPos })
    State.setj({ focusPos: checkFocus(focusPos - QUWINDOW) })
    memorizeThisJob()
    displayResults()
  })
  mina.off("click").click(() => {
    const { focusPos } = State.getj
    if (focusPos == null) {
      return
    }
    State.setj({ prevFocusPos: focusPos })
    State.setj({ focusPos: 0 })
    memorizeThisJob()
    displayResults()
  })
  maxp.off("click").click(() => {
    const { focusPos } = State.getj
    if (focusPos == null) {
      return
    }
    State.setj({ prevFocusPos: focusPos })
    State.setj({ focusPos: checkFocus(focusPos + 1) })
    memorizeThisJob()
    displayResults()
  })
  max2p.off("click").click(() => {
    const { focusPos } = State.getj
    if (focusPos == null) {
      return
    }
    State.setj({ prevFocusPos: focusPos })
    State.setj({ focusPos: checkFocus(focusPos + QUWINDOW) })
    memorizeThisJob()
    displayResults()
  })
  maxa.off("click").click(() => {
    const { focusPos } = State.getj
    if (focusPos == null) {
      return
    }
    State.setj({ prevFocusPos: focusPos })
    State.setj({ focusPos: checkFocus(-1) })
    memorizeThisJob()
    displayResults()
  })
}

const checkFocus = focusPos => {
  /* take care that the focus position is always within
   * the correct range with respect to the number of results
   *
   * We implement here that going past the end of the results
   * will cycle back to the beginning and vice versa,
   * but only in step-by-step mode, not in screenful mode
   */
  const { resultsComposed } = State.gets()

  if (resultsComposed == null) {
    return -2
  }

  const nResults = resultsComposed.length
  if (focusPos == nResults) {
    return 0
  }
  if (focusPos == -1 || focusPos > nResults) {
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
    const { tpResults } = State.gets()
    if (tpResults == null) {
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
  const { jobName } = State.gets()
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
 *    - draw the table of results on the interface
 *    - by screenfuls
 *    - make navigation controls for moving the focus through the table
 */

const runQuery = () => {
  /* Performs a complete query
   * The individual sub steps each check whether there is something to do
   */
  gather()
  const stats = weed()
  drawStats(stats)
  composeResults(false)
  displayResults()
}

const doSearch = (nType, layer, lrInfo, regex) => {
  /* perform regular expression search for a single layer
   * return character positions and nodes that hold those positions
   */
  const { texts: { [nType]: { [layer]: text } }, positions } = corpus
  const { pos: posKey } = lrInfo
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
  const { ntypesR, layers } = config

  const { query } = State.getj()
  const { tpResults } = State.sets({ tpResults: {} })

  for (const nType of ntypesR) {
    const { [nType]: tpInfo = {} } = layers
    const { [nType]: tpQuery } = query
    let intersection = null
    const matchesByLayer = {}

    for (const [layer, lrInfo] of Object.entries(tpInfo)) {
      const box = $(`[kind="pattern"][ntype="${nType}"][layer="${layer}"]`)
      const ebox = $(`[kind="error"][ntype="${nType}"][layer="${layer}"]`)
      clearError(box, ebox)
      const { [layer]: { pattern = "", flags = {}, exec = true } = {} } = tpQuery
      if (!exec || !pattern) {
        continue
      }
      if (pattern.length > MAXINPUT) {
        drawError(
          box,
          ebox,
          `pattern must be less than ${MAXINPUT} characters long`
        )
        continue
      }
      const flagString = Object.entries(flags).filter(x => x[1]).map(x => x[0]).join("")
      let regex
      try {
        regex = new RegExp(pattern, `g${flagString}`)
      } catch (error) {
        drawError(box, ebox, `"${pattern}": ${error}`)
        continue
      }
      const { posFromNode, nodeSet } = doSearch(nType, layer, lrInfo, regex)
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
    tpResults[nType] = { matches, nodes: intersection }
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
  const { ntypes } = config
  const { up, down } = corpus
  const { tpResults } = State.gets()
  const stats = {}

  // determine highest and lowest types in which a search has been performed
  let hi = null
  let lo = null

  for (let i = 0; i < ntypes.length; i++) {
    const nType = ntypes[i]
    const { [nType]: { nodes } } = tpResults

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
    const { [upType]: { nodes: upNodes }, [dnType]: resultsDn = {} } = tpResults
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
    const { [upType]: resultsUp = {}, [dnType]: { nodes: dnNodes } } = tpResults

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
    const { [upType]: { nodes: upNodes }, [dnType]: resultsDn = {} } = tpResults
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
  for (const [nType, { nodes }] of Object.entries(tpResults)) {
    stats[nType] = nodes.size
  }
  return stats
}

const drawStats = stats => {
  /* draw statistics found by weed() on the interface
   */
  const { ntypesR } = config
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
  const { ntypesI, utypeOf } = config
  const { up } = corpus
  const { tpResults, resultsComposed: oldResultsComposed } = State.gets()

  if (tpResults == null) {
    State.sets({ resultsComposed: null })
    return
  }

  const {
    focusPos: oldFocusPos,
    prevFocusPos: oldPrevFocusPos,
    dirty: oldDirty,
    containerType,
  } = State.getj()

  const { [containerType]: { nodes: containerNodes } = {} } = tpResults

  const oldNResults = oldResultsComposed == null ? 1 : oldResultsComposed.length
  const oldNResultsP = Math.max(oldNResults, 1)
  const oldRelative = oldFocusPos / oldNResultsP
  const oldPrevRelative = oldPrevFocusPos / oldNResultsP

  const {
    resultsComposed, resultTypeMap,
  } = State.sets({ resultsComposed: [], resultTypeMap: new Map() })

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
  let focusPos = oldDirty ? -2 : oldFocusPos,
    prevFocusPos = oldDirty ? -2 : oldPrevFocusPos
  if (recomputeFocus) {
    focusPos = Math.min(nResults, Math.round(nResults * oldRelative))
    prevFocusPos = Math.min(nResults, Math.round(nResults * oldPrevRelative))
  } else {
    if (focusPos == -2) {
      focusPos = nResults == 0 ? -1 : 0
      prevFocusPos = -2
    } else if (focusPos > nResults) {
      focusPos = 0
      prevFocusPos = -2
    }
  }

  State.setj({ focusPos, prevFocusPos })
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

  const { dtypeOf, ntypes } = config
  const { down } = corpus
  const { resultTypeMap } = State.gets()

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

const getHLText = (iPositions, matches, text, valueMap) => {
  /* get highlighted text for a node
   * The results of matching a pattern against a text are highlighted within that text
   * returns a sequence of spans, where each span is an array of postions plus a boolean
   * that indicated whether the span is highlighted or not.
   * Used by display() and tabular() below
   */
  const hasMap = valueMap != null

  const spans = []
  let value = ""
  let curHl = null

  for (const i of iPositions) {
    const ch = text[i]
    if (hasMap) {
      value += ch
    }
    const hl = matches.has(i)
    if (curHl == null || curHl != hl) {
      const newSpan = [hl, ch]
      spans.push(newSpan)
      curHl = hl
    } else {
      spans[spans.length - 1][1] += ch
    }
  }
  const tip = hasMap ? valueMap[value] : null
  return { spans, tip }
}

const getLayers = (nType, layers, visibleLayers, includeNodes) => {
  const { [nType]: definedLayers = {} } = layers
  const { [nType]: useLayers } = visibleLayers
  const nodeLayer = includeNodes ? ["_"] : []
  return nodeLayer.concat(Object.keys(definedLayers)).filter(x => useLayers[x])
}

const displayResults = () => {
  /* Displays composed results on the interface.
   * Results are displayed in a table, around a focus position
   * We only display a limited amount of results around the focus position,
   * but the user can move the focus position in various ways.
   * Per result this is visible:
   *   Ancestor nodes are rendered highlighted
   *   The container nodes themselves are rendered as single nodes
   *     if they have content, otherwise they are left out
   *   The descendants of the container node are rendered with
   *   all of descendants (recursively),
   *     where the descendants that have results are highlighted.
   */
  const { layers, ntypesI, ntypesinit } = config
  const { texts, iPositions } = corpus

  const { resultTypeMap, tpResults, resultsComposed } = State.gets()
  const { settings: { nodeseq }, visibleLayers, focusPos, prevFocusPos } = State.getj()

  if (tpResults == null) {
    State.sets({ resultsComposed: null })
    return
  }

  const genValueHtml = (nType, layer, node) => {
    /* generates the html for a layer of node, including the result highlighting
     */
    if (layer == "_") {
      const num = nodeseq ? node - ntypesinit[nType] + 1 : node
      return `<span class="n">${num}</span>`
    }
    const { [nType]: { [layer]: { pos: posKey, valueMap } } } = layers
    const { [nType]: { [layer]: text } } = texts
    const { [nType]: { [posKey]: iPos } } = iPositions
    const nodeIPositions = iPos.get(node)
    const { [nType]: { matches: { [layer]: matches } = {} } } = tpResults
    const nodeMatches =
      matches == null || !matches.has(node) ? new Set() : matches.get(node)

    const { spans, tip } = getHLText(nodeIPositions, nodeMatches, text, valueMap)
    const hasTip = tip != null
    const tipRep = (hasTip) ? ` title="${tip}"` : ""

    const html = []
    const multiple = spans.length > 1 || hasTip
    if (multiple) {
      html.push(`<span${tipRep}>`)
    }
    for (const [hl, val] of spans) {
      const hlRep = hl ? ` class="hl"` : ""
      html.push(`<span${hlRep}>${val}</span>`)
    }
    if (multiple) {
      html.push(`</span>`)
    }
    return html.join("")
  }

  const genNodeHtml = node => {
    /* generates the html for a node, including all layers and highlighting
     */
    const [n, children] = typeof node === NUMBER ? [node, []] : node
    const nType = resultTypeMap.get(n)
    const { [nType]: { nodes } = {} } = tpResults
    const tpLayers = getLayers(nType, layers, visibleLayers, true)
    const nLayers = tpLayers.length
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
      for (const layer of tpLayers) {
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
    const startPos = Math.max((focusPos || 0) - 2 * QUWINDOW, 0)
    const endPos = Math.min(
      startPos + 4 * QUWINDOW + 1,
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
  const { tpResults } = State.gets()
  if (tpResults == null) {
    return null
  }
  const { layers, ntypes } = config
  const { texts, iPositions } = corpus
  const { visibleLayers } = State.getj()

  const headFields = ["type"]
  const nodeFields = new Map()

  for (let i = 0; i < ntypes.length; i++) {
    const nType = ntypes[i]
    const { [nType]: { matches, nodes } } = tpResults

    if (nodes == null) {
      continue
    }

    const { [nType]: tpLayerInfo } = layers
    const { [nType]: tpTexts } = texts
    const { [nType]: tpIPositions } = iPositions

    const exportLayers = getLayers(nType, layers, visibleLayers, false)
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

      const { [layer]: { pos: posKey, valueMap } } = tpLayerInfo
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
        const { spans, tip } = getHLText(nodeIPositions, nodeMatches, text, valueMap)
        const tipRep = (tip == null) ? "" : `(=${tip})`

        let piece = ""
        for (const [hl, val] of spans) {
          piece += `${hl ? "«" : ""}${val}${hl ? "»" : ""}${tipRep}`
        }
        fields.set(tpLayer, piece)
      }
    }
  }

  const headLine = `node\t${headFields.join("\t")}\n`
  const lines = [headLine]

  for (let i = 0; i < ntypes.length; i++) {
    const nType = ntypes[i]
    const { [nType]: { nodes } } = tpResults
    if (nodes == null) {
      continue
    }

    const sortedNodes = [...nodes].sort()

    for (const node of sortedNodes) {
      const line = [`${node}`]
      const fields = nodeFields.has(node) ? nodeFields.get(node) : new Map()

      for (const headField of headFields) {
        line.push(fields.has(headField) ? fields.get(headField) : "")
      }
      lines.push(`${line.join("\t")}\n`)
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
    freshJob()
  }
  applyJob(found)
}

const freshJob = () => {
  /* Derive an initial jobState from the corpus
   */
  const jobchange = $("#jchange")
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
    clearBrowserState()
  })
  jobdup.off("click").click(() => {
    /* duplicate current job, ask for related new name
    */
    const { jobName } = State.gets()
    const newJob = suggestName(jobName)
    if (newJob == null) {
      return
    }
    copyJob(newJob)
    jobOptions(jobchange)
    clearBrowserState()
  })
  jobrename.off("click").click(() => {
    /* rename current job, ask for related new name
    */
    const { jobName } = State.gets()
    const newJob = suggestName(jobName)
    if (newJob == null) {
      return
    }
    renameJob(newJob)
    jobOptions(jobchange)
    clearBrowserState()
  })
  jobdelete.off("click").click(() => {
    /* delete current job
    */
    deleteJob()
    jobOptions(jobchange)
    clearBrowserState()
  })
  jobchange.change(e => {
    /* switch to another job
    */
    const { jobName } = State.gets()
    const newJob = e.target.value
    if (jobName == newJob) {
      return
    }
    switchJob(newJob)
    clearBrowserState()
  })

  /* populate the list of known options
  */
  jobOptions(jobchange)
}

const jobOptions = jobchange => {
  /* populate the options of the select box with the remembered jobs in localStorage
   */
  const { jobName } = State.gets()
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
   * But if job is null, the first new name will be taken straightaway
   * without user interaction.
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
    if (job != null) {
      const answer = prompt("New job name:", newName)
      if (answer == null) {
        cancelled = true
      } else {
        newName = answer
      }
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
  const { jobName } = State.gets()

  if (jobName == newJob) {
    return
  }
  State.startj(newJob, { dirty: true })
  /* the dirty bit will trigger the apply job to clear the results
  */
  freshJob()
  applyJob(true)
}

const copyJob = newJob => {
  /* copy current job to a new name
   */
  let { jobName } = State.gets()
  if (jobName == newJob) {
    return
  }
  jobName = newJob
  State.sets({ jobName })
  applyJob(false)
  memorizeThisJob()
}

const renameJob = newJob => {
  /* rename current job
   */
  let { jobName } = State.gets()
  if (jobName == newJob) {
    return
  }
  forgetJob(jobName)
  jobName = newJob
  State.sets({ jobName })
  applyJob(false)
  memorizeThisJob()
}

const deleteJob = () => {
  /* delete current job
   * But only if there is still a job left,
   * otherwise rename to the default name
   */
  const { jobName } = State.gets()
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

const importJob = (job, incomingJob) => {
  /* import a job, where the name and jobState are given
  */
  State.startj(job, incomingJob)
  applyJob(true)
  memorizeThisJob()
  const jobchange = $("#jchange")
  jobOptions(jobchange)
}

const saveJob = () => {
  /* save current job state to file
   * The file will be offered to the user as a download
   */
  const { jobName } = State.gets()
  const jobState = State.getj()

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
        importJob(job, JSON.parse(e.target.result))
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

const APREFIX = "ls"
const LASTJOBKEY = `${APREFIX}LastJob`
const defaultJobName = () => `${config.name}-`
const getJobPrefix = () => `${APREFIX}/${config.name}/`
const getJobKey = job => `${getJobPrefix()}${job}`

/* writing */

const memorizeJobName = job => {
  /* We store a special key in local storage that contains
   * the key of the last job that the user has worked with.
   * Here we commit a name of a job to localStorage as last job.
   */
  localStorage.setItem(LASTJOBKEY, job)
}

const memorizeThisJobName = () => {
  /* Here we commit a name of the current job to localStorage as last job.
  */
  const { jobName } = State.gets()
  localStorage.setItem(LASTJOBKEY, jobName)
}

const memorizeThisJob = () => {
  /* store current job in localStorage and mark it as last job
   */
  const { jobName } = State.gets()
  const jobState = State.getj()
  const jobKey = getJobKey(jobName)
  localStorage.setItem(jobKey, JSON.stringify(jobState))
  memorizeThisJobName()
}

/* reading */

const rememberLastJobName = () => localStorage.getItem(LASTJOBKEY)

const rememberJob = job => {
  /* retrieve data for specified job from localStorage
   */
  const jobName = job || defaultJobName()
  const jobKey = getJobKey(jobName)
  const jobContent = localStorage.getItem(jobKey)
  const incomingJob = jobContent ? JSON.parse(jobContent) : {}
  State.startj(jobName, incomingJob)
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
 *
 * Document loading:
 * we take care that the user sees as much of the interface as early as possible.
 * We specifiy all scripts in the header of the document, but with the defer
 * attribute, so that the scripts load asynchronously
 * and are executed in the given order:
 *
 * config.js (information on the basis of which this app builds the interface,
 * small file)
 * layered.js (the app itself, this very script that you are reading now)
 * corpus.js (corpus data, a big file, multi-megabyte)
 *
 * When the document is ready, and the app has been loaded, the app will execute
 * initConfig() which builds the interface.
 *
 * In the meanwhile, the corpus is still being fetched, while the interface is
 * probably already rendered.
 * When the corpus is in, the app will execute initCorpus().
 *
 * Then the app continues by fetching the most recent known job, if any,
 * and executes its query, if it is not dirty.
 *
 * Only then the app is ready to use, and the progress/waiting markers disappear.
 */

const sleep = async seconds => {
  // to be called as: await sleep(n)
  //
  await new Promise(r => setTimeout(r, seconds * 1000))
}

const initConfig = () => {
  warmUpConfig()
  addWidgets()
  activateSearch()
  activateNumberControl()
  activateJobs()
  activateImport()
  activateExport()
}

const initCorpus = async () => {
  dressUp()
  warmUpData()
  initJob()
}

$(() => {
  const pbox = $("#progress")
  clearProgress(pbox)
  drawProgress(pbox, "Javascript has kicked in.")
  State = new StateProvider()
  initConfig()
  drawProgress(pbox, "Reading corpus ...")
})

$(window).on("load", () => {
  const pbox = $("#progress")
  initCorpus()
  clearProgress(pbox)
})
