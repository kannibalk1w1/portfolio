import { describe, it, expect } from 'vitest'
import { parseUECopyText } from '../../../src/renderer/src/lib/blueprint/parseUECopyText'

const SAMPLE = `Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
   EventReference=(MemberParent=Class'"/Script/Engine.Actor"',MemberName="ReceiveBeginPlay")
   bOverrideFunction=True
   NodePosX=0
   NodePosY=0
   NodeGuid=AABBCCDD00000000000000000000001A
   CustomProperties Pin (PinId=AABBCCDD00000000000000000000002A,PinName="OutputDelegate",Direction="EGPD_Output",PinType.PinCategory="delegate",LinkedTo=())
   CustomProperties Pin (PinId=AABBCCDD00000000000000000000003A,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",LinkedTo=(K2Node_CallFunction_0 AABBCCDD00000000000000000000005A,))
End Object
Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_0"
   FunctionReference=(MemberParent=Class'"/Script/Engine.KismetSystemLibrary"',MemberName="PrintString")
   NodePosX=368
   NodePosY=0
   NodeGuid=AABBCCDD00000000000000000000004A
   CustomProperties Pin (PinId=AABBCCDD00000000000000000000005A,PinName="execute",Direction="EGPD_Input",PinType.PinCategory="exec",LinkedTo=(K2Node_Event_0 AABBCCDD00000000000000000000003A,))
   CustomProperties Pin (PinId=AABBCCDD00000000000000000000006A,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",LinkedTo=())
   CustomProperties Pin (PinId=AABBCCDD00000000000000000000007A,PinName="InString",Direction="EGPD_Input",PinType.PinCategory="string",LinkedTo=())
End Object`

describe('parseUECopyText', () => {
  it('returns null for text with no Begin Object blocks', () => {
    expect(parseUECopyText('hello world')).toBeNull()
    expect(parseUECopyText('')).toBeNull()
  })

  it('parses node count correctly', () => {
    const result = parseUECopyText(SAMPLE)
    expect(result).not.toBeNull()
    expect(result!.nodes).toHaveLength(2)
  })

  it('extracts node positions', () => {
    const result = parseUECopyText(SAMPLE)!
    const event = result.nodes.find(n => n.className.includes('K2Node_Event'))!
    expect(event.posX).toBe(0)
    expect(event.posY).toBe(0)
    const fn = result.nodes.find(n => n.className.includes('K2Node_CallFunction'))!
    expect(fn.posX).toBe(368)
  })

  it('sets displayName from class name', () => {
    const result = parseUECopyText(SAMPLE)!
    const fn = result.nodes.find(n => n.className.includes('K2Node_CallFunction'))!
    expect(fn.displayName).toBe('Call Function')
  })

  it('parses pins with direction and type', () => {
    const result = parseUECopyText(SAMPLE)!
    const fn = result.nodes.find(n => n.className.includes('K2Node_CallFunction'))!
    const execIn = fn.pins.find(p => p.name === 'execute')!
    expect(execIn.direction).toBe('input')
    expect(execIn.type).toBe('exec')
    const strIn = fn.pins.find(p => p.name === 'InString')!
    expect(strIn.type).toBe('string')
  })

  it('builds edges from output pin LinkedTo references', () => {
    const result = parseUECopyText(SAMPLE)!
    expect(result.edges).toHaveLength(1)
    const edge = result.edges[0]
    const eventNode = result.nodes.find(n => n.className.includes('K2Node_Event'))!
    const fnNode = result.nodes.find(n => n.className.includes('K2Node_CallFunction'))!
    expect(edge.sourceNodeId).toBe(eventNode.id)
    expect(edge.targetNodeId).toBe(fnNode.id)
  })

  it('uses NodeGuid as node id', () => {
    const result = parseUECopyText(SAMPLE)!
    expect(result.nodes[0].id).toBe('AABBCCDD00000000000000000000001A')
  })

  it('skips blocks without NodeGuid and still returns valid nodes', () => {
    const text = `Begin Object Name="K2Node_Bad_0"
   NodePosX=0
   NodePosY=0
End Object
Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
   NodePosX=100
   NodePosY=0
   NodeGuid=AABBCCDD00000000000000000000001A
End Object`
    const result = parseUECopyText(text)
    expect(result).not.toBeNull()
    expect(result!.nodes).toHaveLength(1)
    expect(result!.nodes[0].posX).toBe(100)
  })

  it('builds multiple edges when one output pin connects to multiple targets', () => {
    const text = `Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
   NodePosX=0
   NodePosY=0
   NodeGuid=AABBCCDD00000000000000000000001A
   CustomProperties Pin (PinId=AABBCCDD00000000000000000000002A,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",LinkedTo=(K2Node_CallFunction_0 AABBCCDD00000000000000000000005A,K2Node_CallFunction_1 AABBCCDD00000000000000000000008A,))
End Object
Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_0"
   NodePosX=200
   NodePosY=0
   NodeGuid=AABBCCDD00000000000000000000004A
   CustomProperties Pin (PinId=AABBCCDD00000000000000000000005A,PinName="execute",Direction="EGPD_Input",PinType.PinCategory="exec",LinkedTo=())
End Object
Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_1"
   NodePosX=200
   NodePosY=100
   NodeGuid=AABBCCDD00000000000000000000007A
   CustomProperties Pin (PinId=AABBCCDD00000000000000000000008A,PinName="execute",Direction="EGPD_Input",PinType.PinCategory="exec",LinkedTo=())
End Object`
    const result = parseUECopyText(text)
    expect(result).not.toBeNull()
    expect(result!.edges).toHaveLength(2)
  })
})
