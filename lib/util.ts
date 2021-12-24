import _ from 'lodash'
import { Edge, Graph } from 'graphlib'

/*
 * Adds a dummy node to the graph and return v.
 */
export function addDummyNode(
  g: Graph,
  type: unknown,
  attrs: { [key: string]: any },
  name: string
) {
  let v: string
  do {
    v = _.uniqueId(name)
  } while (g.hasNode(v))

  attrs.dummy = type
  g.setNode(v, attrs)
  return v
}

/*
 * Returns a new graph with only simple edges. Handles aggregation of data
 * associated with multi-edges.
 */
export function simplify(g: Graph) {
  const simplified = new Graph().setGraph(g.graph())
  _.forEach(g.nodes(), function (v) {
    simplified.setNode(v, g.node(v))
  })
  _.forEach(g.edges(), function (e) {
    const simpleLabel = simplified.edge(e.v, e.w) || { weight: 0, minlen: 1 }
    const label = g.edge(e)
    simplified.setEdge(e.v, e.w, {
      weight: simpleLabel.weight + label.weight,
      minlen: Math.max(simpleLabel.minlen, label.minlen),
    })
  })
  return simplified
}

export function asNonCompoundGraph(g: Graph) {
  const simplified = new Graph({ multigraph: g.isMultigraph() }).setGraph(
    g.graph()
  )
  _.forEach(g.nodes(), function (v) {
    if (!g.children(v).length) {
      simplified.setNode(v, g.node(v))
    }
  })
  _.forEach(g.edges(), function (e) {
    simplified.setEdge(e, g.edge(e))
  })
  return simplified
}

export function successorWeights(g: Graph) {
  const weightMap = _.map(g.nodes(), function (v) {
    const sucs: { [key: string]: number } = {}
    _.forEach(g.outEdges(v), function (e: Edge) {
      sucs[e.w] = (sucs[e.w] || 0) + g.edge(e).weight
    })
    return sucs
  })
  return _.zipObject(g.nodes(), weightMap)
}

export function predecessorWeights(g: Graph) {
  const weightMap = _.map(g.nodes(), (v: string) => {
    const preds: { [key: string]: number } = {}
    _.forEach(g.inEdges(v) as Edge[], (e: Edge) => {
      preds[e.v] = (preds[e.v] || 0) + g.edge(e).weight
    })
    return preds
  })
  return _.zipObject(g.nodes(), weightMap)
}

/*
 * Finds where a line starting at point ({x, y}) would intersect a rectangle
 * ({x, y, width, height}) if it were pointing at the rectangle's center.
 */
export function intersectRect(
  rect: { x: number; y: number; width: number; height: number },
  point: { x: number; y: number }
) {
  const x = rect.x
  const y = rect.y

  // Rectangle intersection algorithm from:
  // http://math.stackexchange.com/questions/108113/find-edge-between-two-boxes
  const dx = point.x - x
  const dy = point.y - y
  let w = rect.width / 2
  let h = rect.height / 2

  if (!dx && !dy) {
    throw new Error('Not possible to find intersection inside of the rectangle')
  }

  let sx: number
  let sy: number
  if (Math.abs(dy) * w > Math.abs(dx) * h) {
    // Intersection is top or bottom of rect.
    if (dy < 0) {
      h = -h
    }
    sx = (h * dx) / dy
    sy = h
  } else {
    // Intersection is left or right of rect.
    if (dx < 0) {
      w = -w
    }
    sx = w
    sy = (w * dy) / dx
  }

  return { x: x + sx, y: y + sy }
}

/*
 * Given a DAG with each node assigned "rank" and "order" properties, this
 * function will produce a matrix with the ids of each node.
 */
export function buildLayerMatrix(g: Graph) {
  const layering: string[][] = _.map(_.range(maxRank(g) + 1), function () {
    return []
  })
  _.forEach(g.nodes(), (v: string) => {
    const node = g.node(v)
    const rank = node.rank
    if (!_.isUndefined(rank)) {
      layering[rank][node.order] = v
    }
  })
  return layering
}

/*
 * Adjusts the ranks for all nodes in the graph such that all nodes v have
 * rank(v) >= 0 and at least one node w has rank(w) = 0.
 */
export function normalizeRanks(g: Graph) {
  const min = _.min(
    _.map(g.nodes(), (v: string) => {
      return g.node(v).rank
    })
  )
  _.forEach(g.nodes(), (v: string) => {
    const node = g.node(v)
    if (_.has(node, 'rank')) {
      node.rank -= min
    }
  })
}

export function removeEmptyRanks(g: Graph) {
  // Ranks may not start at 0, so we need to offset them
  const offset = _.min(
    _.map(g.nodes(), (v: string) => {
      return g.node(v).rank
    })
  )

  const layers: string[][] = []
  _.forEach(g.nodes(), (v: string) => {
    const rank = g.node(v).rank - offset
    if (!layers[rank]) {
      layers[rank] = []
    }
    layers[rank].push(v)
  })

  let delta = 0
  const nodeRankFactor = (g.graph() as any).nodeRankFactor
  _.forEach(layers, (vs, i) => {
    if (_.isUndefined(vs) && Number(i) % nodeRankFactor !== 0) {
      --delta
    } else if (delta) {
      _.forEach(vs, (v: string) => {
        g.node(v).rank += delta
      })
    }
  })
}

export function addBorderNode(
  g: Graph,
  prefix: string,
  rank?: number,
  order?: number
) {
  const node: { width: number; height: number; rank?: number; order?: number } =
    {
      width: 0,
      height: 0,
    }
  if (rank != null && order != null) {
    node.rank = rank
    node.order = order
  }
  return addDummyNode(g, 'border', node, prefix)
}

export function maxRank(g: Graph) {
  return _.max(
    _.map(g.nodes(), (v: string) => {
      const rank = g.node(v).rank
      if (!_.isUndefined(rank)) {
        return rank
      }
    })
  )
}

/*
 * Partition a collection into two groups: `lhs` and `rhs`. If the supplied
 * function returns true for an entry it goes into `lhs`. Otherwise it goes
 * into `rhs`.
 */
export function partition<T>(collection: Array<T>, fn: (value: T) => boolean) {
  const result: { lhs: T[]; rhs: T[] } = { lhs: [], rhs: [] }
  _.forEach(collection, (value: T) => {
    if (fn(value)) {
      result.lhs.push(value)
    } else {
      result.rhs.push(value)
    }
  })
  return result
}

/*
 * Returns a new function that wraps `fn` with a timer. The wrapper logs the
 * time it takes to execute the function.
 */
export function time(name: string, fn: () => unknown) {
  const start = _.now()
  try {
    return fn()
  } finally {
    console.log(name + ' time: ' + (_.now() - start) + 'ms')
  }
}

export function notime(_: string, fn: () => unknown) {
  return fn()
}
