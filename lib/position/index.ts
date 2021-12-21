import _ from 'lodash'
import * as util from '@dagre/util'
import { positionX } from '@dagre/position/bk'
import { Graph } from 'graphlib'

export function position(g: Graph) {
  g = util.asNonCompoundGraph(g)

  positionY(g)
  _.forEach(positionX(g), function (x, v) {
    g.node(v).x = x
  })
}

function positionY(g: Graph) {
  const layering = util.buildLayerMatrix(g)
  const rankSep = (g.graph() as any).ranksep
  let prevY = 0
  _.forEach(layering, function (layer) {
    const maxHeight = _.max(
      _.map(layer, function (v) {
        return g.node(v).height
      })
    )
    _.forEach(layer, function (v) {
      g.node(v).y = prevY + maxHeight / 2
    })
    prevY += maxHeight + rankSep
  })
}
