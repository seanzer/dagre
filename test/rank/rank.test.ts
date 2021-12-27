import { Graph } from 'graphlib'
import _ from 'lodash'
import { rank } from '../../lib/rank'

describe('rank', function () {
  const RANKERS = [
    'longest-path',
    'tight-tree',
    'network-simplex',
    'unknown-should-still-work',
  ]
  let g: Graph

  beforeEach(function () {
    g = new Graph()
      .setGraph({})
      .setDefaultNodeLabel(function () {
        return {}
      })
      .setDefaultEdgeLabel(function () {
        return { minlen: 1, weight: 1 }
      })
      .setPath(['a', 'b', 'c', 'd', 'h'])
      .setPath(['a', 'e', 'g', 'h'])
      .setPath(['a', 'f', 'g'])
  })

  _.forEach(RANKERS, function (ranker) {
    describe(ranker, function () {
      it('respects the minlen attribute', function () {
        // eslint-disable-next-line @typescript-eslint/no-extra-semi
        ;(g.graph() as unknown as Record<string, string>).ranker = ranker
        rank(g)
        _.forEach(g.edges(), function (e) {
          const vRank = g.node(e.v).rank
          const wRank = g.node(e.w).rank
          expect(wRank - vRank).toBeGreaterThanOrEqual(g.edge(e).minlen)
        })
      })

      it('can rank a single node graph', function () {
        const g = new Graph()
          .setGraph({
            ranker,
          })
          .setNode('a', {})
        rank(g)
        expect(g.node('a').rank).toEqual(0)
      })
    })
  })
})
