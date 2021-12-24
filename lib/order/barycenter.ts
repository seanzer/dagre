import { Graph } from 'graphlib'
import _ from 'lodash'

export function barycenter(g: Graph, movable: string[]) {
  return _.map(movable, function (v) {
    const inV = g.inEdges(v)
    if (!inV!.length) {
      return { v: v }
    } else {
      const result = _.reduce(inV, function (acc, e) {
        const edge = g.edge(e)
        const nodeU = g.node(e.v)
        return {
          sum: acc.sum + (edge.weight * nodeU.order),
          weight: acc.weight + edge.weight,
        }
      }, { sum: 0, weight: 0 })

      return {
        v: v,
        barycenter: result.sum / result.weight,
        weight: result.weight,
      }
    }
  })
}
