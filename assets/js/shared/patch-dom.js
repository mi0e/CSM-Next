/** Preserve node identity, focus and unchanged SVGs when refreshing a server. */
export function patchElement(element, markup) {
  const template = document.createElement('template')
  template.innerHTML = markup.trim()
  const next = template.content.firstElementChild
  const sync = (current, incoming) => {
    if (current.nodeType !== incoming.nodeType || current.nodeName !== incoming.nodeName) {
      current.replaceWith(incoming.cloneNode(true))
      return
    }
    if (current.nodeType === 3) {
      if (current.nodeValue !== incoming.nodeValue) current.nodeValue = incoming.nodeValue
      return
    }
    if (current.nodeType !== 1) return
    for (const attr of [...current.attributes]) {
      if (!incoming.hasAttribute(attr.name)) current.removeAttribute(attr.name)
    }
    for (const attr of [...incoming.attributes]) {
      if (current.getAttribute(attr.name) !== attr.value) current.setAttribute(attr.name, attr.value)
    }
    const previous = [...current.childNodes], following = [...incoming.childNodes]
    for (let i = 0; i < Math.max(previous.length, following.length); i += 1) {
      if (!following[i]) previous[i].remove()
      else if (!previous[i]) current.append(following[i].cloneNode(true))
      else sync(previous[i], following[i])
    }
  }
  sync(element, next)
}
