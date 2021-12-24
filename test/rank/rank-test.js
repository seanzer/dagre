import _ from 'lodash'
const {rank} = require('../../lib/rank')
const Graph = require('graphlib').Graph

describe('rank', function () {
  const RANKERS = [
    'longest-path', 'tight-tree',
    'network-simplex', 'unknown-should-still-work',
  ]
  let g

  beforeEach(function () {
    g = new Graph()
      .setGraph({})
      .setDefaultNodeLabel(function () { return {} })
      .setDefaultEdgeLabel(function () { return { minlen: 1, weight: 1 } })
      .setPath(['a', 'b', 'c', 'd', 'h'])
      .setPath(['a', 'e', 'g', 'h'])
      .setPath(['a', 'f', 'g'])
  })

  _.forEach(RANKERS, function (ranker) {
    describe(ranker, function () {
      it('respects the minlen attribute', function () {
        g.graph().ranker = ranker
        rank(g)
        _.forEach(g.edges(), function (e) {
          const vRank = g.node(e.v).rank
          const wRank = g.node(e.w).rank
          expect(wRank - vRank).toBeGreaterThanOrEqual(g.edge(e).minlen)
        })
      })

      it('can rank a single node graph', function () {
        const g = new Graph().setGraph({}).setNode('a', {})
        rank(g, ranker)
        expect(g.node('a').rank).toEqual(0)
      })
    })
  })
})
