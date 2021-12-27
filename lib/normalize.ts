'use strict'

import { Edge, Graph } from 'graphlib'
import _ from 'lodash'
import * as util from './util'

function getGraphLabel(g: Graph) {
  return g.graph() as unknown as { dummyChains: string[] }
}

/*
 * Breaks any long edges in the graph into short segments that span 1 layer
 * each. This operation is undoable with the denormalize function.
 *
 * Pre-conditions:
 *
 *    1. The input graph is a DAG.
 *    2. Each node in the graph has a "rank" property.
 *
 * Post-condition:
 *
 *    1. All edges in the graph have a length of 1.
 *    2. Dummy nodes are added where edges have been split into segments.
 *    3. The graph is augmented with a "dummyChains" attribute which contains
 *       the first dummy in each chain of dummy nodes produced.
 */
export function run(g: Graph) {
  getGraphLabel(g).dummyChains = []
  _.forEach(g.edges(), function (edge) {
    normalizeEdge(g, edge)
  })
}

function normalizeEdge(g: Graph, e: Edge) {
  let v = e.v
  let vRank = g.node(v).rank
  const w = e.w
  const wRank = g.node(w).rank
  const name = e.name
  const edgeLabel = g.edge(e)
  const labelRank = edgeLabel.labelRank

  if (wRank === vRank + 1) return

  g.removeEdge(e)

  let dummy, attrs: any, i
  for (i = 0, ++vRank; vRank < wRank; ++i, ++vRank) {
    edgeLabel.points = []
    attrs = {
      width: 0,
      height: 0,
      edgeLabel: edgeLabel,
      edgeObj: e,
      rank: vRank,
    }
    dummy = util.addDummyNode(g, 'edge', attrs, '_d')
    if (vRank === labelRank) {
      attrs.width = edgeLabel.width
      attrs.height = edgeLabel.height
      attrs.dummy = 'edge-label'
      attrs.labelpos = edgeLabel.labelpos
    }
    g.setEdge(v, dummy, { weight: edgeLabel.weight }, name)
    if (i === 0) {
      getGraphLabel(g).dummyChains.push(dummy)
    }
    v = dummy
  }

  g.setEdge(v, w, { weight: edgeLabel.weight }, name)
}

export function undo(g: Graph) {
  _.forEach(getGraphLabel(g).dummyChains, function (v) {
    let node = g.node(v)
    const origLabel = node.edgeLabel
    let w
    g.setEdge(node.edgeObj, origLabel)
    let current: string | undefined = v
    while (current && node.dummy) {
      w = g.successors(current)?.[0]
      g.removeNode(current)
      origLabel.points.push({ x: node.x, y: node.y })
      if (node.dummy === 'edge-label') {
        origLabel.x = node.x
        origLabel.y = node.y
        origLabel.width = node.width
        origLabel.height = node.height
      }
      current = w
      node = current ? g.node(current) : undefined
    }
  })
}
