/*eslint-env jquery*/

/* global corpus */


const NUMBER = "number"

const LAYERS = {
  full: {
    map: "full",
    legend: null,
  },
  cv: {
    map: "cv",
    legend: "phClass",
  },
  voice: {
    map: "cv",
    legend: "phVoice",
  },
  place: {
    map: "cv",
    legend: "phPlace",
  },
  manner: {
    map: "cv",
    legend: "phManner",
  },
}

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

const warmUp = () => {
  console.log("Warming up")
  console.log("language")
  corpus.language = decompress(corpus.language)
  console.log("speakers")
  corpus.speakers = decompress(corpus.speakers)
  console.log("up")
  corpus.up = decompress(corpus.up)
  console.log("Done")
}

const genLegend = (name, info) => {
  const { legend } = info
  if (legend == null) {
    return ""
  }

  const data = corpus.legend[legend]
  const html = []

  html.push(`
<details>
  <summary>${name}</summary>
`)
  for (const [acro, full] of Object.entries(data)) {
    html.push(`
  <div class="legend">
    <b>${acro}</b>
    =
    ${full}
  </div>
`)
  }
  html.push(`
</details>
`)
  return html.join("")
}

const doSearch = (name, info, pattern) => {
  const x = `SEARCH ${name} ${info} ${pattern}`
  console.log(x)
  return ["RESULTS"]
}

const displayResults = results => {
  console.log(results)
}

const goAction = (name, info) => {
  const button = $(`#search${name}>button`)
  const box = $(`#search${name}>input`)
  button.off('click').click(e => {
    e.preventDefault()
    const results = doSearch(name, info, box.value)
    displayResults(results)
  })
}

const addWidgets = () => {
  const where = $("#search")
  const html = []

  for (const [name, info] of Object.entries(LAYERS)) {
    html.push(genWidget(name, info))
  }
  where.html(html.join(""))

  for (const [name, info] of Object.entries(LAYERS)) {
    goAction(name, info)
  }
}

const genWidget = (name, info) => `
<div class="search" id="search${name}">
  <input type="text">
  <button>go</button>
  ${genLegend(name, info)}
</div>
`

/* main
 *
 */

$(() => {
  warmUp()
  addWidgets()
})
