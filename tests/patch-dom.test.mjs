import assert from 'node:assert/strict'
import test from 'node:test'
import { patchElement } from '../src/assets/js/shared/patch-dom.js'

// Minimal DOM operations let the diff algorithm run without a browser dependency.
class Node {
  constructor(name, attrs = {}, children = []) {
    this.nodeName = name
    this.nodeType = name === '#text' ? 3 : 1
    this.attrs = { ...attrs }
    this.nodeValue = this.nodeType === 3 ? attrs.value : null
    this.childNodes = children
    children.forEach(child => { child.parent = this })
  }
  get attributes() { return Object.entries(this.attrs).map(([name, value]) => ({ name, value })) }
  hasAttribute(name) { return Object.hasOwn(this.attrs, name) }
  getAttribute(name) { return this.attrs[name] }
  setAttribute(name, value) { this.attrs[name] = value }
  removeAttribute(name) { delete this.attrs[name] }
  cloneNode() { return new Node(this.nodeName, this.nodeType === 3 ? { value: this.nodeValue } : this.attrs, this.childNodes.map(child => child.cloneNode())) }
  append(child) { this.childNodes.push(child); child.parent = this }
  remove() { this.parent.childNodes.splice(this.parent.childNodes.indexOf(this), 1) }
  replaceWith(child) { this.parent.childNodes[this.parent.childNodes.indexOf(this)] = child; child.parent = this.parent }
}

test('metric patches retain server, focused control and unchanged SVG identities', () => {
  const text = new Node('#text', { value: '10%' })
  const svg = new Node('svg', { class: 'gauge' })
  const root = new Node('article', { tabindex: '0', class: 'offline' }, [text, svg])
  const next = new Node('article', { tabindex: '0' }, [new Node('#text', { value: '20%' }), new Node('svg', { class: 'gauge' })])
  globalThis.document = { createElement: () => ({ content: { firstElementChild: next } }) }
  patchElement(root, '<article>fixture</article>')
  assert.equal(root.childNodes[0], text)
  assert.equal(root.childNodes[1], svg)
  assert.equal(text.nodeValue, '20%')
  assert.equal(root.hasAttribute('class'), false)
  assert.equal(root.getAttribute('tabindex'), '0')
})

test('optional lines can be added, replaced and removed', () => {
  const root = new Node('article', {}, [new Node('span')])
  let next = new Node('article', {}, [new Node('strong'), new Node('span', { title: 'Node 1' })])
  globalThis.document = { createElement: () => ({ content: { firstElementChild: next } }) }
  patchElement(root, '<article>fixture</article>')
  assert.deepEqual(root.childNodes.map(child => child.nodeName), ['strong', 'span'])
  assert.equal(root.childNodes[1].getAttribute('title'), 'Node 1')
  next = new Node('article')
  patchElement(root, '<article></article>')
  assert.equal(root.childNodes.length, 0)
})
