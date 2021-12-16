/* global chai, dagre */

// These are smoke tests to make sure the bundles look like they are working
// correctly.

var expect = chai.expect;
var graphlib = dagre.graphlib;

describe("bundle", function() {
  it("exports dagre", function() {
    expect(dagre).toBeTruthy();
    expect(dagre.graphlib).toBeTruthy();
    expect(dagre.layout).toBeInstanceOf("function");
    expect(dagre.util).toBeTruthy();
    expect(dagre.version).toBeInstanceOf("string");
  });

  it("can do trivial layout", function() {
    var g = new graphlib.Graph().setGraph({});
    g.setNode("a", { label: "a", width: 50, height: 100 });
    g.setNode("b", { label: "b", width: 50, height: 100 });
    g.setEdge("a", "b", { label: "ab", width: 50, height: 100 });

    dagre.layout(g);
    expect(g.node("a")).to.have.property("x");
    expect(g.node("a")).to.have.property("y");
    expect(g.node("a").x).toBeGreaterThanOrEqual(0);
    expect(g.node("a").y).toBeGreaterThanOrEqual(0);
    expect(g.edge("a", "b")).to.have.property("x");
    expect(g.edge("a", "b")).to.have.property("y");
    expect(g.edge("a", "b").x).toBeGreaterThanOrEqual(0);
    expect(g.edge("a", "b").y).toBeGreaterThanOrEqual(0);
  });
});
