import { Edge, Graph } from 'graphlib'
import _ from 'lodash'
import { greedyFAS } from './greedy-fas'

export function run(g: Graph) {
  const graphLabel = g.graph() as unknown as { [key: string]: unknown }
  const fas =
    'acyclicer' in graphLabel && graphLabel.acyclicer === 'greedy'
      ? greedyFAS(g, weightFn(g))
      : dfsFAS(g)
  _.forEach(fas, (e) => {
    const label = g.edge(e)
    g.removeEdge(e)
    label.forwardName = e.name
    label.reversed = true
    g.setEdge(e.w, e.v, label, _.uniqueId('rev'))
  })

  function weightFn(g: Graph) {
    return function (e: Edge) {
      return g.edge(e).weight
    }
  }
}

function dfsFAS(g: Graph) {
  const fas: Edge[] = []
  const stack: Record<string, boolean> = {}
  const visited: Record<string, boolean> = {}

  function dfs(v: string) {
    if (_.has(visited, v)) {
      return
    }
    visited[v] = true
    stack[v] = true
    _.forEach(g.outEdges(v) ?? [], (e: Edge) => {
      if (_.has(stack, e.w)) {
        fas.push(e)
      } else {
        dfs(e.w)
      }
    })
    delete stack[v]
  }

  _.forEach(g.nodes(), dfs)
  return fas
}

export function undo(g: Graph) {
  _.forEach(g.edges(), (e) => {
    const label = g.edge(e)
    if (label.reversed) {
      g.removeEdge(e)

      const forwardName = label.forwardName
      delete label.reversed
      delete label.forwardName
      g.setEdge(e.w, e.v, label, forwardName)
    }
  })
}
