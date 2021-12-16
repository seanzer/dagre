var _ = require("lodash");
var Graph = require("../../lib/graphlib").Graph;
var order = require("../../lib/order");
var crossCount = require("../../lib/order/cross-count");
var util = require("../../lib/util");

describe("order", function() {
  var g;

  beforeEach(function() {
    g = new Graph()
      .setDefaultEdgeLabel({ weight: 1 });
  });

  it("does not add crossings to a tree structure", function() {
    g.setNode("a", { rank: 1 });
    _.forEach(["b", "e"], function(v) { g.setNode(v, { rank: 2 }); });
    _.forEach(["c", "d", "f"], function(v) { g.setNode(v, { rank: 3 }); });
    g.setPath(["a", "b", "c"]);
    g.setEdge("b", "d");
    g.setPath(["a", "e", "f"]);
    order(g);
    var layering = util.buildLayerMatrix(g);
    expect(crossCount(g, layering)).toEqual(0);
  });

  it("can solve a simple graph", function() {
    // This graph resutoBeLessThanOrEquald in a single crossing for previous versions of dagre.
    _.forEach(["a", "d"], function(v) { g.setNode(v, { rank: 1 }); });
    _.forEach(["b", "f", "e"], function(v) { g.setNode(v, { rank: 2 }); });
    _.forEach(["c", "g"], function(v) { g.setNode(v, { rank: 3 }); });
    order(g);
    var layering = util.buildLayerMatrix(g);
    expect(crossCount(g, layering)).toEqual(0);
  });

  it("can minimize crossings", function() {
    g.setNode("a", { rank: 1 });
    _.forEach(["b", "e", "g"], function(v) { g.setNode(v, { rank: 2 }); });
    _.forEach(["c", "f", "h"], function(v) { g.setNode(v, { rank: 3 }); });
    g.setNode("d", { rank: 4 });
    order(g);
    var layering = util.buildLayerMatrix(g);
    expect(crossCount(g, layering)).toBeLessThanOrEqual(1);
  });
});
