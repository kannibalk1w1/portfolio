export interface ParsedPin {
  id: string
  name: string
  direction: 'input' | 'output'
  type: string
}

export interface ParsedNode {
  id: string
  className: string
  displayName: string
  posX: number
  posY: number
  comment: string
  pins: ParsedPin[]
}

export interface ParsedEdge {
  id: string
  sourceNodeId: string
  sourcePinId: string
  targetNodeId: string
  targetPinId: string
}

export interface ParsedBlueprint {
  nodes: ParsedNode[]
  edges: ParsedEdge[]
}

function toDisplayName(className: string): string {
  const short = className.split('.').pop() ?? className
  const stripped = short.replace(/^K2Node_/, '')
  return stripped.replace(/([A-Z])/g, ' $1').trim()
}

function parsePin(line: string): ParsedPin | null {
  const idMatch = line.match(/PinId=([0-9A-Fa-f]+)/)
  const nameMatch = line.match(/PinName="([^"]*)"/)
  const dirMatch = line.match(/Direction="(EGPD_Input|EGPD_Output)"/)
  const typeMatch = line.match(/PinType\.PinCategory="([^"]*)"/)
  if (!idMatch || !nameMatch) return null
  return {
    id: idMatch[1],
    name: nameMatch[1],
    direction: dirMatch?.[1] === 'EGPD_Output' ? 'output' : 'input',
    type: typeMatch?.[1] ?? 'unknown',
  }
}

export function parseUECopyText(text: string): ParsedBlueprint | null {
  const blockRe = /Begin Object[^\n]*\n([\s\S]*?)End Object/g
  const blocks = [...text.matchAll(blockRe)]
  if (blocks.length === 0) return null

  // First pass: collect name → guid mapping for edge resolution
  const nameToGuid = new Map<string, string>()
  for (const block of blocks) {
    const nameMatch = block[0].match(/Name="([^"]+)"/)
    const guidMatch = block[1].match(/NodeGuid=([0-9A-Fa-f]+)/)
    if (nameMatch && guidMatch) nameToGuid.set(nameMatch[1], guidMatch[1])
  }

  const nodes: ParsedNode[] = []
  const edges: ParsedEdge[] = []
  const seenEdgeIds = new Set<string>()

  for (const block of blocks) {
    const full = block[0]
    const body = block[1]

    const classMatch = full.match(/Class=([^\s]+)/)
    const guidMatch = body.match(/NodeGuid=([0-9A-Fa-f]+)/)
    const posXMatch = body.match(/NodePosX=(-?\d+)/)
    const posYMatch = body.match(/NodePosY=(-?\d+)/)
    const commentMatch = body.match(/NodeComment="([^"]*)"/)

    if (!guidMatch) continue

    const className = classMatch?.[1] ?? ''
    const id = guidMatch[1]

    const pins: ParsedPin[] = []
    const pinLines = body.match(/CustomProperties Pin \([^)]+\)/g) ?? []
    for (const line of pinLines) {
      const pin = parsePin(line)
      if (pin) pins.push(pin)
    }

    // Build edges from output pins' LinkedTo references
    for (const line of pinLines) {
      const dirMatch = line.match(/Direction="(EGPD_Output)"/)
      if (!dirMatch) continue
      const pinIdMatch = line.match(/PinId=([0-9A-Fa-f]+)/)
      const linkedMatch = line.match(/LinkedTo=\(([^)]+)\)/)
      if (!pinIdMatch || !linkedMatch) continue
      const linkedStr = linkedMatch[1].trim()
      if (!linkedStr) continue
      // Format: "ObjectName PinId," (may be multiple, comma-separated)
      for (const ref of linkedStr.split(',')) {
        const parts = ref.trim().split(/\s+/)
        if (parts.length < 2) continue
        const targetName = parts[0]
        const targetPinId = parts[1]
        const targetNodeId = nameToGuid.get(targetName)
        if (!targetNodeId) continue
        const edgeId = `${id}_${pinIdMatch[1]}_${targetNodeId}_${targetPinId}`
        if (seenEdgeIds.has(edgeId)) continue
        seenEdgeIds.add(edgeId)
        edges.push({ id: edgeId, sourceNodeId: id, sourcePinId: pinIdMatch[1], targetNodeId, targetPinId })
      }
    }

    nodes.push({
      id,
      className,
      displayName: toDisplayName(className),
      posX: posXMatch ? parseInt(posXMatch[1], 10) : 0,
      posY: posYMatch ? parseInt(posYMatch[1], 10) : 0,
      comment: commentMatch?.[1] ?? '',
      pins,
    })
  }

  return { nodes, edges }
}
