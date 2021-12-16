var Graph = require("../lib/graphlib").Graph;
var components = require("../lib/graphlib").alg.components;
var nestingGraph = require("../lib/nesting-graph");

describe("rank/nestingGraph", function() {
  var g;

  beforeEach(function() {
    g = new Graph({ compound: true })
      .setGraph({})
      .setDefaultNodeLabel(function() { return {}; });
  });

  describe("run", function() {
    it("connects a disconnected graph", function() {
      g.setNode("a");
      g.setNode("b");
      expect(components(g)).toHaveSize(2);
      nestingGraph.run(g);
      expect(components(g)).toHaveSize(1);
      expect(g.hasNode("a"));
      expect(g.hasNode("b"));
    });

    it("adds border nodes to the top and bottom of a subgraph", function() {
      g.setParent("a", "sg1");
      nestingGraph.run(g);

      var borderTop = g.node("sg1").borderTop;
      var borderBottom = g.node("sg1").borderBottom;
      expect(borderTop).toBeTruthy();
      expect(borderBottom).toBeTruthy();
      expect(g.parent(borderTop)).toEqual("sg1");
      expect(g.parent(borderBottom)).toEqual("sg1");
      expect(g.outEdges(borderTop, "a")).toHaveSize(1);
      expect(g.edge(g.outEdges(borderTop, "a")[0]).minlen).toEqual(1);
      expect(g.outEdges("a", borderBottom)).toHaveSize(1);
      expect(g.edge(g.outEdges("a", borderBottom)[0]).minlen).toEqual(1);
      expect(g.node(borderTop)).toEqual({ width: 0, height: 0, dummy: "border" });
      expect(g.node(borderBottom)).toEqual({ width: 0, height: 0, dummy: "border" });
    });

    it("adds edges between borders of nested subgraphs", function() {
      g.setParent("sg2", "sg1");
      g.setParent("a", "sg2");
      nestingGraph.run(g);

      var sg1Top = g.node("sg1").borderTop;
      var sg1Bottom = g.node("sg1").borderBottom;
      var sg2Top = g.node("sg2").borderTop;
      var sg2Bottom = g.node("sg2").borderBottom;
      expect(sg1Top).toBeTruthy();
      expect(sg1Bottom).toBeTruthy();
      expect(sg2Top).toBeTruthy();
      expect(sg2Bottom).toBeTruthy();
      expect(g.outEdges(sg1Top, sg2Top)).toHaveSize(1);
      expect(g.edge(g.outEdges(sg1Top, sg2Top)[0]).minlen).toEqual(1);
      expect(g.outEdges(sg2Bottom, sg1Bottom)).toHaveSize(1);
      expect(g.edge(g.outEdges(sg2Bottom, sg1Bottom)[0]).minlen).toEqual(1);
    });

    it("adds sufficient weight to border to node edges", function() {
      // We want to keep subgraphs tight, so we should ensure that the weight for
      // the edge between the top (and bottom) border nodes and nodes in the
      // subgraph have weights exceeding anything in the graph.
      g.setParent("x", "sg");
      g.setEdge("a", "x", { weight: 100 });
      g.setEdge("x", "b", { weight: 200 });
      nestingGraph.run(g);

      var top = g.node("sg").borderTop;
      var bot = g.node("sg").borderBottom;
      expect(g.edge(top, "x").weight).toBeGreaterThan(300);
      expect(g.edge("x", bot).weight).toBeGreaterThan(300);
    });

    it("adds an edge from the root to the tops of top-level subgraphs", function() {
      g.setParent("a", "sg1");
      nestingGraph.run(g);

      var root = g.graph().nestingRoot;
      var borderTop = g.node("sg1").borderTop;
      expect(root).toBeTruthy();
      expect(borderTop).toBeTruthy();
      expect(g.outEdges(root, borderTop)).toHaveSize(1);
      expect(g.hasEdge(g.outEdges(root, borderTop)[0])).toBeTrue;
    });

    it("adds an edge from root to each node with the correct minlen #1", function() {
      g.setNode("a");
      nestingGraph.run(g);

      var root = g.graph().nestingRoot;
      expect(root).toBeTruthy();
      expect(g.outEdges(root, "a")).toHaveSize(1);
      expect(g.edge(g.outEdges(root, "a")[0])).toEqual({ weight: 0, minlen: 1 });
    });

    it("adds an edge from root to each node with the correct minlen #2", function() {
      g.setParent("a", "sg1");
      nestingGraph.run(g);

      var root = g.graph().nestingRoot;
      expect(root).toBeTruthy();
      expect(g.outEdges(root, "a")).toHaveSize(1);
      expect(g.edge(g.outEdges(root, "a")[0])).toEqual({ weight: 0, minlen: 3 });
    });

    it("adds an edge from root to each node with the correct minlen #3", function() {
      g.setParent("sg2", "sg1");
      g.setParent("a", "sg2");
      nestingGraph.run(g);

      var root = g.graph().nestingRoot;
      expect(root).toBeTruthy();
      expect(g.outEdges(root, "a")).toHaveSize(1);
      expect(g.edge(g.outEdges(root, "a")[0])).toEqual({ weight: 0, minlen: 5 });
    });

    it("does not add an edge from the root to itself", function() {
      g.setNode("a");
      nestingGraph.run(g);

      var root = g.graph().nestingRoot;
      expect(g.outEdges(root, root)).toEqual([]);
    });

    it("expands inter-node edges to separate SG border and nodes #1", function() {
      g.setEdge("a", "b", { minlen: 1 });
      nestingGraph.run(g);
      expect(g.edge("a", "b").minlen).toEqual(1);
    });

    it("expands inter-node edges to separate SG border and nodes #2", function() {
      g.setParent("a", "sg1");
      g.setEdge("a", "b", { minlen: 1 });
      nestingGraph.run(g);
      expect(g.edge("a", "b").minlen).toEqual(3);
    });

    it("expands inter-node edges to separate SG border and nodes #3", function() {
      g.setParent("sg2", "sg1");
      g.setParent("a", "sg2");
      g.setEdge("a", "b", { minlen: 1 });
      nestingGraph.run(g);
      expect(g.edge("a", "b").minlen).toEqual(5);
    });

    it("sets minlen correctly for nested SG boder to children", function() {
      g.setParent("a", "sg1");
      g.setParent("sg2", "sg1");
      g.setParent("b", "sg2");
      nestingGraph.run(g);

      // We expect the following layering:
      //
      // 0: root
      // 1: empty (close sg2)
      // 2: empty (close sg1)
      // 3: open sg1
      // 4: open sg2
      // 5: a, b
      // 6: close sg2
      // 7: close sg1

      var root = g.graph().nestingRoot;
      var sg1Top = g.node("sg1").borderTop;
      var sg1Bot = g.node("sg1").borderBottom;
      var sg2Top = g.node("sg2").borderTop;
      var sg2Bot = g.node("sg2").borderBottom;

      expect(g.edge(root, sg1Top).minlen).toEqual(3);
      expect(g.edge(sg1Top, sg2Top).minlen).toEqual(1);
      expect(g.edge(sg1Top, "a").minlen).toEqual(2);
      expect(g.edge("a", sg1Bot).minlen).toEqual(2);
      expect(g.edge(sg2Top, "b").minlen).toEqual(1);
      expect(g.edge("b", sg2Bot).minlen).toEqual(1);
      expect(g.edge(sg2Bot, sg1Bot).minlen).toEqual(1);
    });
  });

  describe("cleanup", function() {
    it("removes nesting graph edges", function() {
      g.setParent("a", "sg1");
      g.setEdge("a", "b", { minlen: 1 });
      nestingGraph.run(g);
      nestingGraph.cleanup(g);
      expect(g.successors("a")).toEqual(["b"]);
    });

    it("removes the root node", function() {
      g.setParent("a", "sg1");
      nestingGraph.run(g);
      nestingGraph.cleanup(g);
      expect(g.nodeCount()).toEqual(4); // sg1 + sg1Top + sg1Bottom + "a"
    });
  });
});
