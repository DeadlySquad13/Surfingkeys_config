import conf from "./conf.js"
import help from "./help.js"
import api from "./api.js"

const { categories } = help
const {
  mapkey,
  map,
  vmapkey,
  vmap,
  unmap,
  vunmap,
  Clipboard,
  Front,
  removeSearchAlias,
  addSearchAlias,
} = api

const registerKey = (domain, mapObj, siteleader, mode = "n") => {
  const {
    alias,
    callback,
    leader = domain === "global" ? "" : siteleader,
    category = categories.misc,
    description = "",
    path = "(/.*)?",
  } = mapObj
  const opts = {}

  const key = `${leader}${alias}`

  if (domain !== "global") {
    const d = domain.replace(".", "\\.")
    opts.domain = new RegExp(`^http(s)?://(([a-zA-Z0-9-_]+\\.)*)(${d})${path}`)
  }

  const fullDescription = `#${category} ${description}`

  try {
    switch (mode) {
      case "v":
        if (typeof mapObj.map !== "undefined") {
          vmap(alias, mapObj.map)
        } else {
          vmapkey(key, fullDescription, callback, opts)
        }
        break

      default:
        if (typeof mapObj.map !== "undefined") {
          map(alias, mapObj.map)
        } else {
          mapkey(key, fullDescription, callback, opts) // t, n, r, o
        }
        break
    }
  } catch (e) {
    console.error(`Error registering key ${alias}: ${e}. Mode: ${mode}`)
  }
}

const registerKeys = (maps, aliases, siteleader, mode = "n") => {
  const hydratedAliases = Object.entries(
    aliases
  ).flatMap(([baseDomain, aliasDomains]) =>
    aliasDomains.flatMap((a) => ({ [a]: maps[baseDomain] }))
  )

  const mapsAndAliases = Object.assign({}, maps, ...hydratedAliases)

  Object.entries(mapsAndAliases).forEach(([domain, domainMaps]) =>
    domainMaps.forEach((mapObj) => registerKey(domain, mapObj, siteleader, mode))
  )
}

const registerSearchEngines = (searchEngines, searchleader) =>
  Object.values(searchEngines).forEach((s) => {
    const options = {
      favicon_url: s.favicon,
      skipMaps: true,
    }
    addSearchAlias(
      s.alias,
      s.name,
      s.search,
      "",
      s.compl,
      s.callback,
      undefined,
      options
    )
    mapkey(`${searchleader}${s.alias}`, `#8Search ${s.name}`, () =>
      Front.openOmnibar({ type: "SearchEngine", extra: s.alias })
    )
    mapkey(
      `c${searchleader}${s.alias}`,
      `#8Search ${s.name} with clipboard contents`,
      () => {
        Clipboard.read((c) => {
          Front.openOmnibar({
            type: "SearchEngine",
            pref: c.data,
            extra: s.alias,
          })
        })
      }
    )
  })

const main = async () => {
  window.surfingKeys = api
  if (conf.settings) {
    Object.assign(
      settings,
      typeof conf.settings === "function" ? conf.settings() : conf.settings
    )
  }

  /* if (conf.logLevels) {
    await chrome.storage.local.set({
      logLevels: conf.logLevels,
    })
  } */

  if (conf.keys && conf.keys.unmaps) {
    const { unmaps } = conf.keys
    if (unmaps.mappings) {
      unmaps.mappings.forEach((m) => unmap(m))
    }
    if (unmaps.vmappings) {
      unmaps.vmappings.forEach((m) => vunmap(m))
    }
    if (unmaps.searchAliases) {
      Object.entries(unmaps.searchAliases).forEach(([leader, items]) => {
        items.forEach((v) => removeSearchAlias(v, leader))
      })
    }
  }

  if (conf.searchEngines) {
    registerSearchEngines(conf.searchEngines, conf.searchleader ?? "o")
  }

  if (conf.keys && conf.keys.maps) {
    const { keys } = conf
    const { maps, aliases = {} } = keys
    registerKeys(maps, aliases, conf.siteleader)
  }
  if (conf.keys && conf.keys.vmaps) {
    const { keys } = conf
    const { vmaps, aliases = {} } = keys
    registerKeys(vmaps, aliases, conf.siteleader, "v")
  }

}

if (typeof window !== "undefined") {
  main()
}
