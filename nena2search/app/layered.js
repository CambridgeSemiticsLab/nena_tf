/*eslint-env jquery*/

/* global corpus */


const NUMBER = "number"

const decompress = data => {
  const result = {}
  for (const [nodeSpec, value] of data) {
    if (typeof nodeSpec === NUMBER) {
      result[nodeSpec] = value
    }
    else {
      for (const nodeRange of nodeSpec) {
        if (typeof nodeRange === NUMBER) {
          result[nodeRange] = value
        }
        else {
          for (let n = nodeRange[0]; n <= nodeRange[1]; n++) {
            result[n] = value
          }
        }
      }
    }
  }
  return result

}

const dressUp = () => {
  const { captions: { title } } = corpus
  $("head>title").html(title)
  $("#title").html(title)
}

const warmUp = () => {
  corpus.up = decompress(corpus.up)
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
  }
  else {
    html.push(`
<div>${name}</div>
`)
  }
  return html.join("")
}

const doSearch = (nType, name, info, pattern) => {
  const x = `SEARCH ${nType} ${name} ${info} ${pattern}`
  console.log(x)
  return ["RESULTS"]
}

const displayResults = results => {
  console.log(results)
}

const goAction = (nType, name, info) => {
  const button = $(`#search_${nType}_${name}>button`)
  const box = $(`#search_${nType}_${name}>input`)
  button.off('click').click(e => {
    e.preventDefault()
    const results = doSearch(nType, name, info, box.value)
    displayResults(results)
  })
}

const addWidgets = () => {
  const where = $("#search")
  const html = []

  for (const nType of corpus.ntypes) {
    const typeInfo = corpus.layers[nType]
    if (typeInfo) {
      html.push(genTypeWidgets(nType, typeInfo))
    }
  }
  where.html(html.join(""))

  for (const [nType, typeInfo] of Object.entries(corpus.layers)) {
    for (const [name, info] of Object.entries(typeInfo)) {
      goAction(nType, name, info)
    }
  }
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
  return html.join("")
}

const genWidget = (nType, name, info) => `
<div class="layer" id="search_${nType}_${name}">
  <input type="text">
  <button>go</button>
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
