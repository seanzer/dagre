import _ from 'lodash'
import { addSubgraphConstraints } from '@dagre/order/add-subgraph-constraints'
import { Graph } from 'graphlib'

describe('order/addSubgraphConstraints', () => {
  let g: Graph
  let cg: Graph

  beforeEach(() => {
    g = new Graph({ compound: true })
    cg = new Graph()
  })

  it('does not change CG for a flat set of nodes', () => {
    const vs = ['a', 'b', 'c', 'd']
    _.forEach(vs, (v) => {
      g.setNode(v)
    })
    addSubgraphConstraints(g, cg, vs)
    expect(cg.nodeCount()).toEqual(0)
    expect(cg.edgeCount()).toEqual(0)
  })

  it("doesn't create a constraint for contiguous subgraph nodes", () => {
    const vs = ['a', 'b', 'c']
    _.forEach(vs, (v) => {
      g.setParent(v, 'sg')
    })
    addSubgraphConstraints(g, cg, vs)
    expect(cg.nodeCount()).toEqual(0)
    expect(cg.edgeCount()).toEqual(0)
  })

  it('adds a constraint when the parents for adjacent nodes are different', () => {
    const vs = ['a', 'b']
    g.setParent('a', 'sg1')
    g.setParent('b', 'sg2')
    addSubgraphConstraints(g, cg, vs)
    expect(cg.edges()).toEqual([{ v: 'sg1', w: 'sg2' }])
  })

  it('works for multiple levels', () => {
    const vs = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    _.forEach(vs, (v) => {
      g.setNode(v)
    })
    g.setParent('b', 'sg2')
    g.setParent('sg2', 'sg1')
    g.setParent('c', 'sg1')
    g.setParent('d', 'sg3')
    g.setParent('sg3', 'sg1')
    g.setParent('f', 'sg4')
    g.setParent('g', 'sg5')
    g.setParent('sg5', 'sg4')
    addSubgraphConstraints(g, cg, vs)
    expect(_.sortBy(cg.edges(), 'v')).toEqual([
      { v: 'sg1', w: 'sg4' },
      { v: 'sg2', w: 'sg3' },
    ])
  })
})
