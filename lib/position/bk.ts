/**
 * This module provides coordinate assignment based on Brandes and Köpf, "Fast
 * and Simple Horizontal Coordinate Assignment."
 */

import _ from 'lodash'
import { Edge, Graph } from 'graphlib'
import * as util from '@dagre/util'

/*
 * Marks all edges in the graph with a type-1 conflict with the "type1Conflict"
 * property. A type-1 conflict is one where a non-inner segment crosses an
 * inner segment. An inner segment is an edge with both incident nodes marked
 * with the "dummy" property.
 *
 * This algorithm scans layer by layer, starting with the second, for type-1
 * conflicts between the current layer and the previous layer. For each layer
 * it scans the nodes from left to right until it reaches one that is incident
 * on an inner segment. It then scans predecessors to determine if they have
 * edges that cross that inner segment. At the end a final scan is done for all
 * nodes on the current rank to see if they cross the last visited inner
 * segment.
 *
 * This algorithm (safely) assumes that a dummy node will only be incident on a
 * single node in the layers being scanned.
 */
export function findType1Conflicts(g: Graph, layering: string[][]) {
  const conflicts: Record<string, Record<string, boolean>> = {}

  function visitLayer(prevLayer: string[], layer: string[]) {
    let // last visited node in the previous layer that is incident on an inner
      // segment.
      k0 = 0
    // Tracks the last node in this layer scanned for crossings with a type-1
    // segment.
    let scanPos = 0
    const prevLayerLength = prevLayer.length
    const lastNode = _.last(layer)

    _.forEach(layer, function (v, i) {
      const w = findOtherInnerSegmentNode(g, v)
      const k1 = w ? g.node(w).order : prevLayerLength

      if (w || v === lastNode) {
        _.forEach(layer.slice(scanPos, i + 1), function (scanNode) {
          _.forEach(g.predecessors(scanNode) ?? [], function (u) {
            const uLabel = g.node(u)
            const uPos = uLabel.order
            if (
              (uPos < k0 || k1 < uPos) &&
              !(uLabel.dummy && g.node(scanNode).dummy)
            ) {
              addConflict(conflicts, u, scanNode)
            }
          })
        })
        scanPos = i + 1
        k0 = k1
      }
    })

    return layer
  }

  _.reduce(layering, visitLayer)
  return conflicts
}

export function findType2Conflicts(g: Graph, layering: string[][]) {
  const conflicts: Record<string, Record<string, boolean>> = {}

  function scan(
    south: string[],
    southPos: number,
    southEnd: number,
    prevNorthBorder: number,
    nextNorthBorder: number
  ) {
    let v: string
    _.forEach(_.range(southPos, southEnd), function (i) {
      v = south[i]
      if (g.node(v).dummy) {
        _.forEach(g.predecessors(v) ?? [], function (u) {
          const uNode = g.node(u)
          if (
            uNode.dummy &&
            (uNode.order < prevNorthBorder || uNode.order > nextNorthBorder)
          ) {
            addConflict(conflicts, u, v)
          }
        })
      }
    })
  }

  function visitLayer(north: string[], south: string[]) {
    let prevNorthPos = -1
    let nextNorthPos: number
    let southPos = 0

    _.forEach(south, function (v, southLookahead) {
      if (g.node(v).dummy === 'border') {
        const predecessors = g.predecessors(v)
        if (predecessors?.length) {
          nextNorthPos = g.node(predecessors[0]).order
          scan(south, southPos, southLookahead, prevNorthPos, nextNorthPos)
          southPos = southLookahead
          prevNorthPos = nextNorthPos
        }
      }
      scan(south, southPos, south.length, nextNorthPos, north.length)
    })

    return south
  }

  _.reduce(layering, visitLayer)
  return conflicts
}

function findOtherInnerSegmentNode(g: Graph, v: string) {
  if (g.node(v).dummy) {
    return _.find(g.predecessors(v) ?? [], function (u) {
      return g.node(u).dummy
    }) as string
  }
}

export function addConflict(
  conflicts: Record<string, Record<string, boolean>>,
  v: string,
  w: string
) {
  if (v > w) {
    const tmp = v
    v = w
    w = tmp
  }

  let conflictsV = conflicts[v]
  if (!conflictsV) {
    conflicts[v] = conflictsV = {}
  }
  conflictsV[w] = true
}

export function hasConflict(
  conflicts: Record<string, Record<string, boolean>>,
  v: string,
  w: string
) {
  if (v > w) {
    const tmp = v
    v = w
    w = tmp
  }
  return _.has(conflicts[v], w)
}

/*
 * Try to align nodes into vertical "blocks" where possible. This algorithm
 * attempts to align a node with one of its median neighbors. If the edge
 * connecting a neighbor is a type-1 conflict then we ignore that possibility.
 * If a previous node has already formed a block with a node after the node
 * we're trying to form a block with, we also ignore that possibility - our
 * blocks would be split in that scenario.
 */
export function verticalAlignment(
  g: Graph,
  layering: string[][],
  conflicts: Record<string, Record<string, boolean>>,
  neighborFn: (v: string) => string[]
) {
  const root: Record<string, string> = {}
  const align: Record<string, string> = {}
  const pos: Record<string, number> = {}

  // We cache the position here based on the layering because the graph and
  // layering may be out of sync. The layering matrix is manipulated to
  // generate different extreme alignments.
  _.forEach(layering, function (layer) {
    _.forEach(layer, function (v, order) {
      root[v] = v
      align[v] = v
      pos[v] = order
    })
  })

  _.forEach(layering, function (layer) {
    let prevIdx = -1
    _.forEach(layer, function (v) {
      let ws = neighborFn(v)
      if (ws.length) {
        ws = _.sortBy(ws, function (w) {
          return pos[w]
        })
        const mp = (ws.length - 1) / 2
        for (let i = Math.floor(mp), il = Math.ceil(mp); i <= il; ++i) {
          const w = ws[i]
          if (
            align[v] === v &&
            prevIdx < pos[w] &&
            !hasConflict(conflicts, v, w)
          ) {
            align[w] = v
            align[v] = root[v] = root[w]
            prevIdx = pos[w]
          }
        }
      }
    })
  })

  return { root, align }
}

export function horizontalCompaction(
  g: Graph,
  layering: string[][],
  root: Record<string, string>,
  align: Record<string, string>,
  reverseSep = false
) {
  // This portion of the algorithm differs from BK due to a number of problems.
  // Instead of their algorithm we construct a new block graph and do two
  // sweeps. The first sweep places blocks with the smallest possible
  // coordinates. The second sweep removes unused space by moving blocks to the
  // greatest coordinates without violating separation.
  const xs: Record<string, number> = {}
  const blockG = buildBlockGraph(g, layering, root, reverseSep)
  const borderType = reverseSep ? 'borderLeft' : 'borderRight'

  function iterate(
    setXsFunc: (v: string) => void,
    nextNodesFunc: (v: string) => string[]
  ) {
    let stack = blockG.nodes()
    let elem = stack.pop()
    const visited: Record<string, boolean> = {}
    while (elem) {
      if (visited[elem]) {
        setXsFunc(elem)
      } else {
        visited[elem] = true
        stack.push(elem)
        stack = stack.concat(nextNodesFunc(elem))
      }

      elem = stack.pop()
    }
  }

  // First pass, assign smallest coordinates
  function pass1(elem: string) {
    xs[elem] =
      blockG.inEdges(elem)?.reduce(function (acc: number, e: Edge) {
        return Math.max(acc, xs[e.v] + blockG.edge(e))
      }, 0) ?? 0
  }

  // Second pass, assign greatest coordinates
  function pass2(elem: string) {
    const min =
      blockG.outEdges(elem)?.reduce(function (acc: number, e: Edge) {
        return Math.min(acc, xs[e.w] - blockG.edge(e))
      }, Number.POSITIVE_INFINITY) ?? Number.POSITIVE_INFINITY

    const node = g.node(elem)
    if (min !== Number.POSITIVE_INFINITY && node.borderType !== borderType) {
      xs[elem] = Math.max(xs[elem], min)
    }
  }

  iterate(pass1, (v) => blockG.predecessors(v) ?? [])
  iterate(pass2, (v) => blockG.successors(v) ?? [])

  // Assign x coordinates to all nodes
  _.forEach(align, function (v) {
    xs[v] = xs[root[v]]
  })

  return xs
}

function buildBlockGraph(
  g: Graph,
  layering: string[][],
  root: Record<string, string>,
  reverseSep: boolean
): Graph {
  const blockGraph = new Graph()
  const graphLabel = g.graph() as unknown as {
    nodesep: number
    edgesep: number
  }
  const sepFn = sep(graphLabel.nodesep, graphLabel.edgesep, reverseSep)

  _.forEach(layering, function (layer) {
    let u: string
    _.forEach(layer, function (v) {
      const vRoot = root[v]
      blockGraph.setNode(vRoot)
      if (u) {
        const uRoot = root[u]
        const prevMax = blockGraph.edge(uRoot, vRoot)
        blockGraph.setEdge(uRoot, vRoot, Math.max(sepFn(g, v, u), prevMax || 0))
      }
      u = v
    })
  })

  return blockGraph
}

/*
 * Returns the alignment that has the smallest width of the given alignments.
 */
export function findSmallestWidthAlignment(
  g: Graph,
  xss: Record<string, Record<string, number>>
) {
  return _.minBy(_.values(xss), function (xs) {
    let max = Number.NEGATIVE_INFINITY
    let min = Number.POSITIVE_INFINITY

    _.forIn(xs, function (x, v) {
      const halfWidth = width(g, v) / 2

      max = Math.max(x + halfWidth, max)
      min = Math.min(x - halfWidth, min)
    })

    return max - min
  })
}

/*
 * Align the coordinates of each of the layout alignments such that
 * left-biased alignments have their minimum coordinate at the same point as
 * the minimum coordinate of the smallest width alignment and right-biased
 * alignments have their maximum coordinate at the same point as the maximum
 * coordinate of the smallest width alignment.
 */
export function alignCoordinates(
  xss: Record<string, Record<string, number>>,
  alignTo: Record<string, number>
) {
  const alignToValues = _.values(alignTo)
  const alignToMin = _.min(alignToValues)
  const alignToMax = _.max(alignToValues)
  if (alignToMin == null) {
    console.warn('alignToMin undefined or null')
    return
  }
  if (alignToMax == null) {
    console.warn('alignToMax undefined or null')
    return
  }

  _.forEach(['u', 'd'], function (vert) {
    _.forEach(['l', 'r'], function (horizontal) {
      const alignment = vert + horizontal
      const xs = xss[alignment]
      if (xs === alignTo) return

      const xsValues = _.values(xs)
      const xsMin = _.min(xsValues)
      const xsMax = _.max(xsValues)
      if (xsMin == null) {
        console.warn('xsMin undefined or null')
        return
      }
      if (xsMax == null) {
        console.warn('xsMax undefined or null')
        return
      }

      const delta = horizontal === 'l' ? alignToMin - xsMin : alignToMax - xsMax

      if (delta) {
        xss[alignment] = _.mapValues(xs, function (x) {
          return x + delta
        })
      }
    })
  })
}

export function balance(
  xss: Record<string, Record<string, number>>,
  align?: string
) {
  return _.mapValues(xss.ul, function (_value, v) {
    if (align) {
      return xss[align.toLowerCase()][v]
    } else {
      const xs = _.sortBy(_.map(xss, v))
      return (xs[1] + xs[2]) / 2
    }
  })
}

export function positionX(g: Graph) {
  const layering = util.buildLayerMatrix(g)
  const conflicts = _.merge(
    findType1Conflicts(g, layering),
    findType2Conflicts(g, layering)
  )

  const xss: Record<string, Record<string, number>> = {}
  let adjustedLayering: string[][]
  _.forEach(['u', 'd'], function (vert) {
    adjustedLayering = vert === 'u' ? layering : _.values(layering).reverse()
    _.forEach(['l', 'r'], function (horizontal) {
      if (horizontal === 'r') {
        adjustedLayering = _.map(adjustedLayering, function (inner) {
          return _.values(inner).reverse()
        })
      }

      const neighborFn =
        vert === 'u'
          ? (v: string) => g.predecessors(v) ?? []
          : (v: string) => g.successors(v) ?? []
      const align = verticalAlignment(
        g,
        adjustedLayering,
        conflicts,
        neighborFn
      )
      let xs = horizontalCompaction(
        g,
        adjustedLayering,
        align.root,
        align.align,
        horizontal === 'r'
      )
      if (horizontal === 'r') {
        xs = _.mapValues(xs, function (x) {
          return -x
        })
      }
      xss[vert + horizontal] = xs
    })
  })

  const smallestWidth = findSmallestWidthAlignment(g, xss)
  if (smallestWidth != null) {
    alignCoordinates(xss, smallestWidth)
  }
  return balance(xss, (g.graph() as unknown as Record<'align', string>).align)
}

function sep(nodeSep: number, edgeSep: number, reverseSep: boolean) {
  return function (g: Graph, v: string, w: string) {
    const vLabel = g.node(v)
    const wLabel = g.node(w)
    let sum = 0
    let delta

    sum += vLabel.width / 2
    if (_.has(vLabel, 'labelpos')) {
      switch (vLabel.labelpos.toLowerCase()) {
        case 'l':
          delta = -vLabel.width / 2
          break
        case 'r':
          delta = vLabel.width / 2
          break
      }
    }
    if (delta) {
      sum += reverseSep ? delta : -delta
    }
    delta = 0

    sum += (vLabel.dummy ? edgeSep : nodeSep) / 2
    sum += (wLabel.dummy ? edgeSep : nodeSep) / 2

    sum += wLabel.width / 2
    if (_.has(wLabel, 'labelpos')) {
      switch (wLabel.labelpos.toLowerCase()) {
        case 'l':
          delta = wLabel.width / 2
          break
        case 'r':
          delta = -wLabel.width / 2
          break
      }
    }
    if (delta) {
      sum += reverseSep ? delta : -delta
    }
    delta = 0

    return sum
  }
}

function width(g: Graph, v: string): number {
  return g.node(v).width
}
