import { Graph, alg, Edge } from 'graphlib'
import _ from 'lodash'
import * as acyclic from '@dagre/acyclic'

describe('acyclic', function () {
  const ACYCLICERS = ['greedy', 'dfs', 'unknown-should-still-work']
  let g: Graph

  beforeEach(function () {
    g = new Graph({ multigraph: true }).setDefaultEdgeLabel(function () {
      return { minlen: 1, weight: 1 }
    })
  })

  _.forEach(ACYCLICERS, function (acyclicer) {
    describe(acyclicer, function () {
      beforeEach(function () {
        g.setGraph({ acyclicer: acyclicer })
      })

      describe('run', function () {
        it('does not change an already acyclic graph', function () {
          g.setPath(['a', 'b', 'd'])
          g.setPath(['a', 'c', 'd'])
          acyclic.run(g)

          expect(_.sortBy(g.edges(), ['v', 'w'])).toEqual([
            { v: 'a', w: 'b' },
            { v: 'a', w: 'c' },
            { v: 'b', w: 'd' },
            { v: 'c', w: 'd' },
          ])
        })

        it('breaks cycles in the input graph', function () {
          g.setPath(['a', 'b', 'c', 'd', 'a'])
          acyclic.run(g)
          expect(alg.findCycles(g)).toEqual([])
        })

        it('creates a multi-edge where necessary', function () {
          g.setPath(['a', 'b', 'a'])
          acyclic.run(g)
          expect(alg.findCycles(g)).toEqual([])
          if (g.hasEdge('a', 'b')) {
            expect(g.outEdges('a', 'b')).toHaveSize(2)
          } else {
            expect(g.outEdges('b', 'a')).toHaveSize(2)
          }
          expect(g.edgeCount()).toEqual(2)
        })
      })

      describe('undo', function () {
        it('does not change edges where the original graph was acyclic', function () {
          g.setEdge('a', 'b', { minlen: 2, weight: 3 })
          acyclic.run(g)
          acyclic.undo(g)
          expect(g.edge('a', 'b')).toEqual({ minlen: 2, weight: 3 })
          expect(g.edges()).toHaveSize(1)
        })

        it('can restore previosuly reversed edges', function () {
          g.setEdge('a', 'b', { minlen: 2, weight: 3 })
          g.setEdge('b', 'a', { minlen: 3, weight: 4 })
          acyclic.run(g)
          acyclic.undo(g)
          expect(g.edge('a', 'b')).toEqual({ minlen: 2, weight: 3 })
          expect(g.edge('b', 'a')).toEqual({ minlen: 3, weight: 4 })
          expect(g.edges()).toHaveSize(2)
        })
      })
    })
  })

  describe('greedy-specific functionality', function () {
    it('prefers to break cycles at low-weight edges', function () {
      g.setGraph({ acyclicer: 'greedy' })
      g.setDefaultEdgeLabel(function () {
        return { minlen: 1, weight: 2 }
      })
      g.setPath(['a', 'b', 'c', 'd', 'a'])
      g.setEdge('c', 'd', { weight: 1 })
      acyclic.run(g)
      expect(alg.findCycles(g)).toEqual([])
      expect(g.hasEdge('c', 'd')).toBeFalse()
    })
  })
})
