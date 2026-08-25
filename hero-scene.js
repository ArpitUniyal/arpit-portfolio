/* ================================================================
   3D system-graph scene — represents the request/response, service,
   and data flow patterns behind Arpit's full-stack + ML projects.
   Built with Three.js. Fails silently (CSS gradient fallback stays
   visible) if WebGL / the library is unavailable.
   ================================================================ */
(function () {
  "use strict";

  if (typeof THREE === "undefined") return;

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function makeDotTexture(color) {
    var size = 128;
    var c = document.createElement("canvas");
    c.width = c.height = size;
    var ctx = c.getContext("2d");
    var g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, color);
    g.addColorStop(0.35, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    var tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  function buildGraph(opts) {
    var group = new THREE.Group();
    var nodeCount = opts.nodeCount;
    var radiusMin = opts.radiusMin;
    var radiusRange = opts.radiusRange;
    var flatten = opts.flatten;
    var pts = [];
    var positions = new Float32Array(nodeCount * 3);

    for (var i = 0; i < nodeCount; i++) {
      var r = radiusMin + Math.random() * radiusRange;
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos(Math.random() * 2 - 1);
      var x = r * Math.sin(phi) * Math.cos(theta);
      var y = r * Math.sin(phi) * Math.sin(theta) * flatten;
      var z = r * Math.cos(phi);
      pts.push(new THREE.Vector3(x, y, z));
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }

    var nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    var nodeMat = new THREE.PointsMaterial({
      size: opts.nodeSize,
      map: makeDotTexture(opts.nodeColor),
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    var nodePoints = new THREE.Points(nodeGeo, nodeMat);
    group.add(nodePoints);

    // edges between nearby nodes
    var edgeVerts = [];
    var edgePairs = [];
    var maxDist = opts.edgeDist;
    for (var a = 0; a < pts.length; a++) {
      for (var b = a + 1; b < pts.length; b++) {
        if (pts[a].distanceTo(pts[b]) < maxDist && Math.random() < opts.edgeChance) {
          edgeVerts.push(pts[a].x, pts[a].y, pts[a].z, pts[b].x, pts[b].y, pts[b].z);
          edgePairs.push([pts[a], pts[b]]);
        }
      }
    }
    var edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute("position", new THREE.Float32BufferAttribute(edgeVerts, 3));
    var edgeMat = new THREE.LineBasicMaterial({
      color: opts.edgeColor,
      transparent: true,
      opacity: opts.edgeOpacity
    });
    var lines = new THREE.LineSegments(edgeGeo, edgeMat);
    group.add(lines);

    // traveling "packets" along a subset of edges
    var packetCount = Math.min(opts.packetCount, edgePairs.length);
    var packetGeo = new THREE.BufferGeometry();
    var packetPos = new Float32Array(packetCount * 3);
    packetGeo.setAttribute("position", new THREE.BufferAttribute(packetPos, 3));
    var packetMat = new THREE.PointsMaterial({
      size: opts.packetSize,
      map: makeDotTexture(opts.packetColor),
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    var packets = new THREE.Points(packetGeo, packetMat);
    group.add(packets);

    var packetData = [];
    var usedEdges = [];
    while (usedEdges.length < packetCount && edgePairs.length) {
      usedEdges.push(edgePairs[Math.floor(Math.random() * edgePairs.length)]);
    }
    for (var p = 0; p < packetCount; p++) {
      packetData.push({
        edge: usedEdges[p],
        t: Math.random(),
        speed: 0.12 + Math.random() * 0.22
      });
    }

    function updatePackets(dt) {
      var arr = packetGeo.attributes.position.array;
      for (var i = 0; i < packetData.length; i++) {
        var d = packetData[i];
        d.t += d.speed * dt;
        if (d.t > 1) d.t -= 1;
        var from = d.edge[0], to = d.edge[1];
        arr[i * 3] = from.x + (to.x - from.x) * d.t;
        arr[i * 3 + 1] = from.y + (to.y - from.y) * d.t;
        arr[i * 3 + 2] = from.z + (to.z - from.z) * d.t;
      }
      packetGeo.attributes.position.needsUpdate = true;
    }

    return { group: group, updatePackets: updatePackets };
  }

  function initScene(canvasId, config) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var container = canvas.parentElement;
    if (!container) return;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    camera.position.set(0, 0, config.cameraZ);

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    } catch (e) {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    var graph = buildGraph(config.graph);
    scene.add(graph.group);
    graph.group.rotation.x = config.tiltX || 0;

    var target = { x: 0, y: 0 };
    var current = { x: 0, y: 0 };

    function onPointerMove(e) {
      var w = window.innerWidth, h = window.innerHeight;
      var nx = (e.clientX / w) * 2 - 1;
      var ny = (e.clientY / h) * 2 - 1;
      target.y = nx * config.parallax;
      target.x = -ny * config.parallax * 0.6;
    }
    if (config.parallax) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }

    function resize() {
      var w = container.clientWidth || 1;
      var h = container.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    resize();
    window.addEventListener("resize", resize);

    var clock = new THREE.Clock();
    var autoSpeed = reduceMotion ? 0 : config.autoRotate;

    function animate() {
      var dt = Math.min(clock.getDelta(), 0.05);
      graph.group.rotation.y += autoSpeed * dt;
      current.x += (target.x - current.x) * 0.04;
      current.y += (target.y - current.y) * 0.04;
      graph.group.rotation.x = (config.tiltX || 0) + current.x;
      graph.group.rotation.z = current.y * 0.15;
      if (!reduceMotion) graph.updatePackets(dt);
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    animate();
  }

  function boot() {
    initScene("hero-canvas", {
      cameraZ: 15,
      parallax: 0.5,
      autoRotate: 0.045,
      tiltX: 0.15,
      graph: {
        nodeCount: 52,
        radiusMin: 5.5,
        radiusRange: 3.2,
        flatten: 0.62,
        nodeSize: 0.17,
        nodeColor: "#4ce8c4",
        edgeDist: 4.4,
        edgeChance: 0.32,
        edgeColor: 0x2a3542,
        edgeOpacity: 0.55,
        packetCount: 14,
        packetSize: 0.26,
        packetColor: "#ff8a5b"
      }
    });

    initScene("contact-canvas", {
      cameraZ: 13,
      parallax: 0.35,
      autoRotate: 0.03,
      tiltX: -0.1,
      graph: {
        nodeCount: 34,
        radiusMin: 4.5,
        radiusRange: 2.6,
        flatten: 0.55,
        nodeSize: 0.15,
        nodeColor: "#4ce8c4",
        edgeDist: 4,
        edgeChance: 0.3,
        edgeColor: 0x2a3542,
        edgeOpacity: 0.4,
        packetCount: 8,
        packetSize: 0.22,
        packetColor: "#ff8a5b"
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
