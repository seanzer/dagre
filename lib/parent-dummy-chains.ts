import { Graph } from 'graphlib'
import _ from 'lodash'

export function parentDummyChains(g: Graph) {
  const postorderNums = postorder(g)

  _.forEach((g.graph() as any).dummyChains, function (v) {
    let node = g.node(v)
    const edgeObj = node.edgeObj
    const pathData = findPath(g, postorderNums, edgeObj.v, edgeObj.w)
    const path = pathData.path
    const lca = pathData.lca
    let pathIdx = 0
    let pathV = path[pathIdx]
    let ascending = true

    while (v !== edgeObj.w) {
      node = g.node(v)

      if (ascending) {
        while (
          (pathV = path[pathIdx]) !== lca &&
          g.node(pathV).maxRank < node.rank
        ) {
          pathIdx++
        }

        if (pathV === lca) {
          ascending = false
        }
      }

      if (!ascending) {
        while (
          pathIdx < path.length - 1 &&
          g.node((pathV = path[pathIdx + 1])).minRank <= node.rank
        ) {
          pathIdx++
        }
        pathV = path[pathIdx]
      }

      g.setParent(v, pathV)
      v = g.successors(v)?.[0]
    }
  })
}

// Find a path from v to w through the lowest common ancestor (LCA). Return the
// full path and the LCA.
function findPath(g: Graph, postorderNums: any, v: string, w: string) {
  const vPath = []
  const wPath = []
  const low = Math.min(postorderNums[v].low, postorderNums[w].low)
  const lim = Math.max(postorderNums[v].lim, postorderNums[w].lim)
  let parent: string

  // Traverse up from v to find the LCA
  parent = v
  do {
    parent = g.parent(parent) as string
    vPath.push(parent)
  } while (
    parent &&
    (postorderNums[parent].low > low || lim > postorderNums[parent].lim)
  )
  const lca = parent as string

  // Traverse from w to LCA
  parent = w
  while ((parent = g.parent(parent) as string) !== lca) {
    wPath.push(parent)
  }

  return { path: vPath.concat(wPath.reverse()), lca: lca }
}

function postorder(g: Graph) {
  const result: Record<string, any> = {}
  let lim = 0

  function dfs(v: string) {
    const low = lim
    _.forEach(g.children(v), dfs)
    result[v] = { low: low, lim: lim++ }
  }
  _.forEach(g.children(), dfs)

  return result
}
