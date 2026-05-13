import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  Handle, Position,
  type NodeProps, type Node as RFNode, type Edge as RFEdge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { applyBlueprintLayout, mergeBlueprintLayout, parseUECopyText, type BlueprintLayout, type ParsedBlueprint, type ParsedPin } from './parseUECopyText'

function nodeColor(className: string): string {
  if (className.includes('K2Node_Event')) return '#c0392b'
  if (className.includes('K2Node_CallFunction')) return '#2980b9'
  if (/K2Node_Variable(Get|Set)/.test(className)) return '#27ae60'
  if (/K2Node_(IfThenElse|ExecutionSequence|Select)/.test(className)) return '#8e44ad'
  return '#555555'
}

function pinColor(type: string): string {
  if (type === 'exec') return '#ffffff'
  if (type === 'string' || type === 'name') return '#f39c12'
  if (type === 'float' || type === 'int' || type === 'byte') return '#2ecc71'
  if (type === 'bool') return '#e74c3c'
  return '#95a5a6'
}

function PinRow({ pin, side }: { pin: ParsedPin; side: 'left' | 'right' }) {
  const color = pinColor(pin.type)
  const isExec = pin.type === 'exec'
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', padding: '2px 0', justifyContent: side === 'right' ? 'flex-end' : 'flex-start' }}>
      <Handle
        type={side === 'left' ? 'target' : 'source'}
        id={pin.id}
        position={side === 'left' ? Position.Left : Position.Right}
        style={{ background: color, width: 8, height: 8, border: 'none', top: '50%', transform: 'translateY(-50%)', [side === 'left' ? 'left' : 'right']: -4 }}
      />
      <span style={{ fontSize: 11, color, userSelect: 'none', padding: '0 10px' }}>
        {isExec ? '▶' : '●'} {pin.name}
      </span>
    </div>
  )
}

type UENodeData = {
  className: string
  displayName: string
  comment: string
  pins: ParsedPin[]
  onSelect: (id: string) => void
}

function UENode({ id, data: rawData }: NodeProps) {
  const data = rawData as UENodeData
  const inputPins = data.pins.filter(p => p.direction === 'input')
  const outputPins = data.pins.filter(p => p.direction === 'output')
  const color = nodeColor(data.className)
  return (
    <div
      onClick={() => data.onSelect(id)}
      style={{ minWidth: 160, background: '#1e1e2e', border: `2px solid ${color}`, borderRadius: 6, cursor: 'pointer', userSelect: 'none' }}
    >
      <div style={{ background: color, padding: '4px 10px', borderRadius: '4px 4px 0 0', fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
        {data.displayName}
      </div>
      <div style={{ padding: '4px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>{inputPins.map(p => <PinRow key={p.id} pin={p} side="left" />)}</div>
          <div>{outputPins.map(p => <PinRow key={p.id} pin={p} side="right" />)}</div>
        </div>
      </div>
    </div>
  )
}

const NODE_TYPES = { ueNode: UENode }

function blueprintToFlow(bp: ParsedBlueprint, onSelect: (id: string) => void): { nodes: RFNode[]; edges: RFEdge[] } {
  return {
    nodes: bp.nodes.map(n => ({
      id: n.id,
      type: 'ueNode',
      position: { x: n.posX, y: n.posY },
      data: { className: n.className, displayName: n.displayName, comment: n.comment, pins: n.pins, onSelect },
    })),
    edges: bp.edges.map(e => ({
      id: e.id,
      source: e.sourceNodeId,
      sourceHandle: e.sourcePinId,
      target: e.targetNodeId,
      targetHandle: e.targetPinId,
      type: 'smoothstep',
      style: { stroke: '#ffffff', strokeWidth: 1.5 },
    })),
  }
}

interface Props {
  ueText: string
  height?: number
  layout?: BlueprintLayout
  onLayoutChange?: (layout: BlueprintLayout) => void
}

export function BlueprintViewer({ ueText, height = 320, layout, onLayoutChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const parsed = useMemo(() => {
    const bp = parseUECopyText(ueText)
    return bp ? applyBlueprintLayout(bp, layout) : null
  }, [ueText, layout])

  const { nodes: initNodes, edges: initEdges } = useMemo(
    () => parsed ? blueprintToFlow(parsed, setSelectedId) : { nodes: [], edges: [] },
    [parsed]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges)

  useEffect(() => {
    setNodes(initNodes)
    setEdges(initEdges)
  }, [initNodes, initEdges, setNodes, setEdges])

  const selectedNode = parsed?.nodes.find(n => n.id === selectedId) ?? null

  const onPaneClick = useCallback(() => setSelectedId(null), [])
  const handleNodeDragStop = useCallback((_event: unknown, _node: RFNode, currentNodes: RFNode[]) => {
    onLayoutChange?.(mergeBlueprintLayout(layout, currentNodes))
  }, [layout, onLayoutChange])

  if (!parsed) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', borderRadius: 8, color: '#e74c3c', fontSize: 13 }}>
        Couldn't read this blueprint. Try copying again from the UE editor, or use a screenshot instead.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={handleNodeDragStop}
          onPaneClick={onPaneClick}
          nodeTypes={NODE_TYPES}
          fitView
          style={{ background: '#1a1a2e' }}
        >
          <Background color="#2a2a4e" gap={20} />
          <Controls />
          <MiniMap nodeColor={n => nodeColor((n.data as UENodeData).className)} style={{ background: '#111' }} />
        </ReactFlow>
      </div>

      {selectedNode && (
        <div style={{ width: 200, background: '#22223a', borderLeft: '2px solid #7eceff', padding: 12, overflowY: 'auto', fontSize: 12 }}>
          <div style={{ color: '#7eceff', fontWeight: 700, marginBottom: 6 }}>{selectedNode.displayName}</div>
          <div style={{ color: '#888', marginBottom: 8, fontSize: 10 }}>{selectedNode.className.split('.').pop()}</div>
          {selectedNode.comment && (
            <div style={{ color: '#aaa', marginBottom: 8, fontStyle: 'italic' }}>{selectedNode.comment}</div>
          )}
          <div style={{ color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10, marginBottom: 4 }}>Pins</div>
          {selectedNode.pins.map(p => (
            <div key={p.id} style={{ color: pinColor(p.type), marginBottom: 2 }}>
              {p.type === 'exec' ? '▶' : '●'} {p.name}
            </div>
          ))}
          <button
            onClick={() => setSelectedId(null)}
            style={{ marginTop: 12, width: '100%', background: 'none', border: '1px solid #444', borderRadius: 4, color: '#888', fontSize: 11, padding: '4px 0', cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}
