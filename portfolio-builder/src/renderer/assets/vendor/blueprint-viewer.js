/* Blueprint viewer for Launchpad published portfolios.
   Reads pre-parsed blueprint JSON from <script type="application/json"> tags
   and renders an interactive SVG node graph into .bp-canvas elements. */
;(function () {
  'use strict'

  var NODE_W = 170
  var HEADER_H = 24
  var PIN_H = 18
  var PIN_PAD = 4

  var CLASS_COLORS = [
    ['K2Node_Event',        '#c0392b'],
    ['K2Node_CallFunction', '#2980b9'],
    ['K2Node_VariableGet',  '#27ae60'],
    ['K2Node_VariableSet',  '#27ae60'],
    ['K2Node_IfThenElse',   '#8e44ad'],
    ['K2Node_ExecutionSequence', '#8e44ad'],
    ['K2Node_Select',       '#8e44ad'],
  ]
  var DEFAULT_COLOR = '#555555'

  var PIN_TYPE_COLORS = {
    exec: '#ffffff',
    string: '#f39c12',
    name: '#f39c12',
    'float': '#2ecc71',
    'int': '#2ecc71',
    byte: '#2ecc71',
    bool: '#e74c3c',
  }

  function getNodeColor(className) {
    for (var i = 0; i < CLASS_COLORS.length; i++) {
      if (className.indexOf(CLASS_COLORS[i][0]) !== -1) return CLASS_COLORS[i][1]
    }
    return DEFAULT_COLOR
  }

  function getPinColor(type) {
    return PIN_TYPE_COLORS[type] || '#95a5a6'
  }

  function nodeHeight(node) {
    return HEADER_H + PIN_PAD * 2 + Math.max(
      node.pins.filter(function (p) { return p.direction === 'input' }).length,
      node.pins.filter(function (p) { return p.direction === 'output' }).length
    ) * PIN_H
  }

  function pinY(node, pin) {
    var sameSide = node.pins.filter(function (p) { return p.direction === pin.direction })
    var idx = sameSide.indexOf(pin)
    return HEADER_H + PIN_PAD + idx * PIN_H + PIN_H / 2
  }

  function ns(tag) {
    return document.createElementNS('http://www.w3.org/2000/svg', tag)
  }

  function svgText(content, x, y, opts) {
    var t = ns('text')
    t.setAttribute('x', x)
    t.setAttribute('y', y)
    t.setAttribute('font-size', opts.size || 10)
    t.setAttribute('fill', opts.fill || '#fff')
    t.setAttribute('dominant-baseline', 'middle')
    if (opts.anchor) t.setAttribute('text-anchor', opts.anchor)
    if (opts.weight) t.setAttribute('font-weight', opts.weight)
    t.textContent = content
    return t
  }

  function renderNode(node) {
    var g = ns('g')
    g.setAttribute('transform', 'translate(' + node.posX + ',' + node.posY + ')')
    g.dataset.nodeId = node.id
    g.style.cursor = 'pointer'

    var h = nodeHeight(node)
    var color = getNodeColor(node.className)

    // Card background
    var bg = ns('rect')
    bg.setAttribute('width', NODE_W)
    bg.setAttribute('height', h)
    bg.setAttribute('rx', 5)
    bg.setAttribute('fill', '#1e1e2e')
    bg.setAttribute('stroke', color)
    bg.setAttribute('stroke-width', 2)
    g.appendChild(bg)

    // Header
    var hdr = ns('rect')
    hdr.setAttribute('width', NODE_W)
    hdr.setAttribute('height', HEADER_H)
    hdr.setAttribute('rx', 5)
    hdr.setAttribute('fill', color)
    g.appendChild(hdr)

    // Clip the bottom round corners of header
    var hdrSquare = ns('rect')
    hdrSquare.setAttribute('y', HEADER_H - 5)
    hdrSquare.setAttribute('width', NODE_W)
    hdrSquare.setAttribute('height', 5)
    hdrSquare.setAttribute('fill', color)
    g.appendChild(hdrSquare)

    g.appendChild(svgText(node.displayName, NODE_W / 2, HEADER_H / 2, { size: 11, fill: '#fff', anchor: 'middle', weight: 'bold' }))

    // Pins
    var inputPins = node.pins.filter(function (p) { return p.direction === 'input' })
    var outputPins = node.pins.filter(function (p) { return p.direction === 'output' })

    inputPins.forEach(function (pin) {
      var py = pinY(node, pin)
      var pc = getPinColor(pin.type)
      var dot = ns('circle')
      dot.setAttribute('cx', 0)
      dot.setAttribute('cy', py)
      dot.setAttribute('r', 5)
      dot.setAttribute('fill', pc)
      dot.setAttribute('stroke', '#1e1e2e')
      dot.setAttribute('stroke-width', 1)
      g.appendChild(dot)
      g.appendChild(svgText((pin.type === 'exec' ? '▶ ' : '● ') + pin.name, 10, py, { size: 10, fill: pc }))
    })

    outputPins.forEach(function (pin) {
      var py = pinY(node, pin)
      var pc = getPinColor(pin.type)
      var dot = ns('circle')
      dot.setAttribute('cx', NODE_W)
      dot.setAttribute('cy', py)
      dot.setAttribute('r', 5)
      dot.setAttribute('fill', pc)
      dot.setAttribute('stroke', '#1e1e2e')
      dot.setAttribute('stroke-width', 1)
      g.appendChild(dot)
      g.appendChild(svgText(pin.name + (pin.type === 'exec' ? ' ▶' : ' ●'), NODE_W - 10, py, { size: 10, fill: pc, anchor: 'end' }))
    })

    return g
  }

  function findPinPos(nodesMap, nodeId, pinId, side) {
    var node = nodesMap[nodeId]
    if (!node) return null
    var pin = node.pins.find(function (p) { return p.id === pinId })
    if (!pin) return null
    var py = pinY(node, pin)
    return { x: node.posX + (side === 'source' ? NODE_W : 0), y: node.posY + py }
  }

  function renderEdge(edge, nodesMap) {
    var src = findPinPos(nodesMap, edge.sourceNodeId, edge.sourcePinId, 'source')
    var tgt = findPinPos(nodesMap, edge.targetNodeId, edge.targetPinId, 'target')
    if (!src || !tgt) return null
    var cx = (src.x + tgt.x) / 2
    var path = ns('path')
    var d = 'M' + src.x + ',' + src.y +
            ' C' + cx + ',' + src.y + ' ' + cx + ',' + tgt.y +
            ' ' + tgt.x + ',' + tgt.y
    path.setAttribute('d', d)
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', '#ffffff')
    path.setAttribute('stroke-width', 1.5)
    path.setAttribute('opacity', 0.7)
    return path
  }

  function showInspect(container, node) {
    var existing = container.querySelector('.bp-inspect')
    if (existing) existing.remove()

    var panel = document.createElement('div')
    panel.className = 'bp-inspect'
    panel.style.cssText = 'position:absolute;top:8px;right:8px;width:180px;background:#22223a;border:2px solid #7eceff;border-radius:6px;padding:10px;font-size:11px;color:#ccc;max-height:calc(100% - 16px);overflow-y:auto;z-index:10;'

    var title = document.createElement('div')
    title.style.cssText = 'color:#7eceff;font-weight:700;margin-bottom:4px;font-size:12px;'
    title.textContent = node.displayName
    panel.appendChild(title)

    var cls = document.createElement('div')
    cls.style.cssText = 'color:#888;margin-bottom:8px;font-size:10px;'
    cls.textContent = node.className.split('.').pop() || node.className
    panel.appendChild(cls)

    if (node.comment) {
      var cmt = document.createElement('div')
      cmt.style.cssText = 'color:#aaa;font-style:italic;margin-bottom:8px;'
      cmt.textContent = node.comment
      panel.appendChild(cmt)
    }

    var pinsLabel = document.createElement('div')
    pinsLabel.style.cssText = 'color:#666;text-transform:uppercase;letter-spacing:.05em;font-size:9px;margin-bottom:4px;'
    pinsLabel.textContent = 'Pins'
    panel.appendChild(pinsLabel)

    node.pins.forEach(function (pin) {
      var row = document.createElement('div')
      row.style.cssText = 'margin-bottom:2px;color:' + getPinColor(pin.type) + ';'
      row.textContent = (pin.type === 'exec' ? '▶ ' : '● ') + pin.name
      panel.appendChild(row)
    })

    var closeBtn = document.createElement('button')
    closeBtn.textContent = 'Close'
    closeBtn.style.cssText = 'margin-top:10px;width:100%;background:none;border:1px solid #444;border-radius:4px;color:#888;font-size:11px;padding:4px 0;cursor:pointer;'
    closeBtn.addEventListener('click', function () { panel.remove() })
    panel.appendChild(closeBtn)

    container.appendChild(panel)
  }

  function initCanvas(container, data) {
    var nodes = data.nodes || []
    var edges = data.edges || []
    if (nodes.length === 0) return

    container.style.position = 'relative'

    var svg = ns('svg')
    svg.style.cssText = 'width:100%;height:100%;background:#1a1a2e;border-radius:8px;display:block;'
    svg.setAttribute('width', '100%')
    svg.setAttribute('height', '100%')

    var root = ns('g')
    svg.appendChild(root)

    // State
    var tx = 0, ty = 0, scale = 1
    var dragging = false, startX = 0, startY = 0

    function applyTransform() {
      root.setAttribute('transform', 'translate(' + tx + ',' + ty + ') scale(' + scale + ')')
    }

    // Auto-fit: find bounds
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    nodes.forEach(function (n) {
      var h = nodeHeight(n)
      if (n.posX < minX) minX = n.posX
      if (n.posY < minY) minY = n.posY
      if (n.posX + NODE_W > maxX) maxX = n.posX + NODE_W
      if (n.posY + h > maxY) maxY = n.posY + h
    })
    var cw = container.clientWidth || 600
    var ch = container.clientHeight || 400
    var padding = 40
    var scaleX = (cw - padding * 2) / (maxX - minX || 1)
    var scaleY = (ch - padding * 2) / (maxY - minY || 1)
    scale = Math.min(scaleX, scaleY, 1)
    tx = (cw - (maxX - minX) * scale) / 2 - minX * scale
    ty = (ch - (maxY - minY) * scale) / 2 - minY * scale
    applyTransform()

    // Edges (under nodes)
    var nodesMap = {}
    nodes.forEach(function (n) { nodesMap[n.id] = n })
    edges.forEach(function (e) {
      var path = renderEdge(e, nodesMap)
      if (path) root.appendChild(path)
    })

    // Nodes
    nodes.forEach(function (n) {
      var g = renderNode(n)
      g.addEventListener('click', function (e) {
        e.stopPropagation()
        showInspect(container, n)
      })
      root.appendChild(g)
    })

    // Pan
    svg.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return
      dragging = true
      startX = e.clientX - tx
      startY = e.clientY - ty
      svg.style.cursor = 'grabbing'
    })
    window.addEventListener('mousemove', function (e) {
      if (!dragging) return
      tx = e.clientX - startX
      ty = e.clientY - startY
      applyTransform()
    })
    window.addEventListener('mouseup', function () {
      if (dragging) { dragging = false; svg.style.cursor = 'grab' }
    })
    svg.style.cursor = 'grab'

    // Zoom
    svg.addEventListener('wheel', function (e) {
      e.preventDefault()
      var rect = svg.getBoundingClientRect()
      var mx = e.clientX - rect.left
      var my = e.clientY - rect.top
      var delta = e.deltaY < 0 ? 1.1 : 0.9
      var newScale = Math.min(Math.max(scale * delta, 0.1), 4)
      tx = mx - (mx - tx) * (newScale / scale)
      ty = my - (my - ty) * (newScale / scale)
      scale = newScale
      applyTransform()
    }, { passive: false })

    // Click background = close inspect
    svg.addEventListener('click', function () {
      var panel = container.querySelector('.bp-inspect')
      if (panel) panel.remove()
    })

    container.appendChild(svg)
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.bp-canvas').forEach(function (container) {
      var id = container.dataset.id
      var script = document.getElementById('bp-data-' + id)
      if (!script) return
      try {
        var data = JSON.parse(script.textContent || '{}')
        initCanvas(container, data)
      } catch (e) {
        console.warn('blueprint-viewer: failed to parse data for', id, e)
      }
    })
  })
})()
