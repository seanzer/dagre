/**
 * A greedy heuristic for finding a feedback arc set for a graph. A feedback
 * arc set is a set of edges that can be removed to make a graph acyclic.
 * The algorithm comes from: P. Eades, X. Lin, and W. F. Smyth, "A fast and
 * effective heuristic for the feedback arc set problem." This implementation
 * adjusts that from the paper to allow for weighted edges.
 */

import _ from 'lodash'
import { Edge, Graph } from 'graphlib'
import { List, Entry } from './data/list'

const DEFAULT_WEIGHT_FN = _.constant(1)

type Node = {
  v: string
  w: string
  in?: number
  out?: number
  listEntry?: Entry<Node>
}

export function greedyFAS(
  g: Graph,
  weightFn: (edge: Edge) => number = DEFAULT_WEIGHT_FN
) {
  if (g.nodeCount() <= 1) {
    return []
  }
  const state = buildState(g, weightFn)
  const results = doGreedyFAS(state.graph, state.buckets, state.zeroIdx)

  // Expand multi-edges
  return _.flatten(
    _.map(results, (e) => {
      return (g.outEdges(e.v, e.w) as Edge[] | null) ?? []
    })
  )
}

function doGreedyFAS(g: Graph, buckets: List<Node>[], zeroIdx: number) {
  const results: Node[] = []
  const sources = buckets[buckets.length - 1]
  const sinks = buckets[0]

  let entry
  while (g.nodeCount()) {
    while ((entry = sinks.dequeue())) {
      delete entry.value?.listEntry
      removeNode(g, buckets, zeroIdx, entry)
    }
    while ((entry = sources.dequeue())) {
      delete entry.value?.listEntry
      removeNode(g, buckets, zeroIdx, entry)
    }
    if (g.nodeCount()) {
      for (let i = buckets.length - 2; i > 0; --i) {
        entry = buckets[i].dequeue()
        if (entry) {
          delete entry.value?.listEntry
          results.push(...removeNode(g, buckets, zeroIdx, entry, true))
          break
        }
      }
    }
  }

  return results
}

function removeNode(
  g: Graph,
  buckets: List<Node>[],
  zeroIdx: number,
  entry: Entry<Node>,
  collectPredecessors = false
): Node[] {
  const results: Node[] = []

  if (entry.value) {
    _.forEach(g.inEdges(entry.value.v), function (edge) {
      const weight = g.edge(edge)
      const uEntry = g.node(edge.v)

      if (collectPredecessors) {
        results.push({ v: edge.v, w: edge.w })
      }

      uEntry.out -= weight
      assignBucket(buckets, zeroIdx, uEntry)
    })

    _.forEach(g.outEdges(entry.value.v), function (edge) {
      const weight = g.edge(edge)
      const w = edge.w
      const wEntry = g.node(w)
      wEntry.in -= weight
      assignBucket(buckets, zeroIdx, wEntry)
    })

    g.removeNode(entry.value.v)
  }

  return results
}

function buildState(g: Graph, weightFn: (edge: Edge) => number) {
  const fasGraph = new Graph()
  let maxIn = 0
  let maxOut = 0

  _.forEach(g.nodes(), function (v) {
    fasGraph.setNode(v, { v: v, in: 0, out: 0 })
  })

  // Aggregate weights on nodes, but also sum the weights across multi-edges
  // into a single edge for the fasGraph.
  _.forEach(g.edges(), function (e) {
    const prevWeight = fasGraph.edge(e.v, e.w) || 0
    const weight = weightFn(e)
    const edgeWeight = prevWeight + weight
    fasGraph.setEdge(e.v, e.w, edgeWeight)
    maxOut = Math.max(maxOut, (fasGraph.node(e.v).out += weight))
    maxIn = Math.max(maxIn, (fasGraph.node(e.w).in += weight))
  })

  const buckets = _.range(maxOut + maxIn + 3).map(function () {
    return new List<Node>()
  })
  const zeroIdx = maxIn + 1

  _.forEach(fasGraph.nodes(), function (v) {
    assignBucket(buckets, zeroIdx, fasGraph.node(v))
  })

  return { graph: fasGraph, buckets, zeroIdx }
}

function assignBucket(buckets: List<Node>[], zeroIdx: number, node: Node) {
  if (node.out == null) {
    node.listEntry = buckets[0].enqueue(node.listEntry ?? node)
  } else if (node.in == null) {
    node.listEntry = buckets[buckets.length - 1].enqueue(node.listEntry ?? node)
  } else {
    node.listEntry = buckets[node.out - node.in + zeroIdx].enqueue(
      node.listEntry ?? node
    )
  }
}
