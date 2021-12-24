import { Graph } from 'graphlib'
import _ from 'lodash'
import { addDummyNode } from './util'

export function addBorderSegments(g: Graph) {
  function dfs(v: string) {
    const children = g.children(v)
    const node = g.node(v)
    if (children.length) {
      _.forEach(children, dfs)
    }

    if (_.has(node, 'minRank')) {
      node.borderLeft = []
      node.borderRight = []
      for (
        let rank = node.minRank, maxRank = node.maxRank + 1;
        rank < maxRank;
        ++rank
      ) {
        addBorderNode(g, 'borderLeft', '_bl', v, node, rank)
        addBorderNode(g, 'borderRight', '_br', v, node, rank)
      }
    }
  }

  _.forEach(g.children(), dfs)
}

function addBorderNode(
  g: Graph,
  prop: string,
  prefix: string,
  sg: string,
  sgNode: any,
  rank: number
) {
  const label = { width: 0, height: 0, rank: rank, borderType: prop }
  const prev = sgNode[prop][rank - 1]
  const curr = addDummyNode(g, 'border', label, prefix)
  sgNode[prop][rank] = curr
  g.setParent(curr, sg)
  if (prev) {
    g.setEdge(prev, curr, { weight: 1 })
  }
}
