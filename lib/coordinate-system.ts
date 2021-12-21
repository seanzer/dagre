import { Graph } from 'graphlib'
import _ from 'lodash'

export interface GraphRootLabel {
  rankdir?: string
  ranker?: string
}

interface Coordinate {
  x: number
  y: number
}

interface Box extends Coordinate {
  width: number
  height: number
}

export function adjust(g: Graph) {
  const rankDir = (g.graph() as GraphRootLabel).rankdir?.toLowerCase()
  if (rankDir === 'lr' || rankDir === 'rl') {
    swapWidthHeight(g)
  }
}

export function undo(g: Graph) {
  const rankDir = (g.graph() as GraphRootLabel).rankdir?.toLowerCase()
  if (rankDir === 'bt' || rankDir === 'rl') {
    reverseY(g)
  }

  if (rankDir === 'lr' || rankDir === 'rl') {
    swapXY(g)
    swapWidthHeight(g)
  }
}

function swapWidthHeight(g: Graph) {
  _.forEach(g.nodes(), function (v) {
    swapWidthHeightOne(g.node(v))
  })
  _.forEach(g.edges(), function (e) {
    swapWidthHeightOne(g.edge(e))
  })
}

function swapWidthHeightOne(attrs: Box) {
  const w = attrs.width
  attrs.width = attrs.height
  attrs.height = w
}

function reverseY(g: Graph) {
  _.forEach(g.nodes(), function (v) {
    reverseYOne(g.node(v))
  })

  _.forEach(g.edges(), function (e) {
    const edge = g.edge(e)
    _.forEach(edge.points, reverseYOne)
    if (_.has(edge, 'y')) {
      reverseYOne(edge)
    }
  })
}

function reverseYOne(attrs: Box) {
  attrs.y = -attrs.y
}

function swapXY(g: Graph) {
  _.forEach(g.nodes(), function (v) {
    swapXYOne(g.node(v))
  })

  _.forEach(g.edges(), function (e) {
    const edge = g.edge(e)
    _.forEach(edge.points, swapXYOne)
    if (_.has(edge, 'x')) {
      swapXYOne(edge)
    }
  })
}

function swapXYOne(attrs: Coordinate) {
  const x = attrs.x
  attrs.x = attrs.y
  attrs.y = x
}
