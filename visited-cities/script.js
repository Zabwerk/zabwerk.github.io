'use strict';

var color = ['#d3d3d3', '#3598db', '#30cc70', '#f3c218', '#d58337', '#e84c3d'];
var levelNames = ['没去过', '路过', '出差', '游玩', '短居', '居住'];

var ORIGINAL_WIDTH = 1200;
var ORIGINAL_HEIGHT = 800;

function buildVisited() {
    var result = {};
    for (var key in chinaMap) {
        result[key] = 0;
    }
    for (var k in DEFAULT_VISITED) {
        if (chinaMap[k] !== undefined) {
            result[k] = DEFAULT_VISITED[k];
        }
    }
    return result;
}

function saveVisited(visited) {
    try {
        localStorage.setItem('visited-cities-levels', JSON.stringify(visited));
    } catch (e) {}
}

function getMapDimensions() {
    var mapContainer = document.getElementById('map');
    if (!mapContainer) return { width: ORIGINAL_WIDTH, height: ORIGINAL_HEIGHT };
    
    var rect = mapContainer.getBoundingClientRect();
    return {
        width: rect.width || window.innerWidth,
        height: rect.height || (window.innerHeight - 60)
    };
}

function calculateScale() {
    var dims = getMapDimensions();
    var scaleX = dims.width / ORIGINAL_WIDTH;
    var scaleY = dims.height / ORIGINAL_HEIGHT;
    return Math.min(scaleX, scaleY);
}

function renderMap() {
    var visited = buildVisited();
    saveVisited(visited);

    var dims = getMapDimensions();
    var scale = calculateScale();
    
    var mapContainer = document.getElementById('map');
    mapContainer.innerHTML = '';
    
    var map = new Raphael('map', ORIGINAL_WIDTH, ORIGINAL_HEIGHT);
    map.setViewBox(0, 0, ORIGINAL_WIDTH, ORIGINAL_HEIGHT, true);

    var baseAttr = {
        "stroke": "#fff",
        "stroke-opacity": "1",
        "stroke-linejoin": "round",
        "stroke-miterlimit": "4",
        "stroke-width": (0.75 / scale),
        "stroke-dasharray": "none"
    };

    var tooltip = document.getElementById('tooltip');

    for (var key in chinaMap) {
        var city = chinaMap[key];
        var level = visited[key] || 0;
        city.level = level;

        var graph = map.path(city.path);
        graph.attr(baseAttr);
        graph.attr({fill: color[level]});
        city.graph = graph;

        (function (g, name, lv) {
            var baseT = g.transform() || '';
            var bbox = g.getBBox();
            var cx = bbox.x + bbox.width / 2;
            var cy = bbox.y + bbox.height / 2;

            g.node.onmouseover = function (e) {
                g.transform(baseT + ' s1.02,' + cx + ',' + cy);
                tooltip.textContent = name + ' — ' + levelNames[lv];
                tooltip.style.display = 'block';
                tooltip.style.left = (e.clientX + 12) + 'px';
                tooltip.style.top = (e.clientY - 30) + 'px';
            };
            g.node.onmousemove = function (e) {
                tooltip.style.left = (e.clientX + 12) + 'px';
                tooltip.style.top = (e.clientY - 30) + 'px';
            };
            g.node.onmouseout = function () {
                g.transform(baseT);
                tooltip.style.display = 'none';
            };
        })(graph, city.name, level);
    }
    
    var mapSVG = mapContainer.querySelector('svg');
    if (mapSVG) {
        mapSVG.style.width = '100%';
        mapSVG.style.height = '100%';
        mapSVG.style.display = 'block';
        mapSVG.style.margin = '0 auto';
        mapSVG.style.maxWidth = '100%';
        mapSVG.style.maxHeight = '100%';
    }

    Array.from(document.getElementsByClassName('select')).forEach(function (el) {
        el.style.backgroundColor = color[el.getAttribute('data-level')];
    });
}

window.onload = function () {
    renderMap();
};

window.addEventListener('resize', function () {
    renderMap();
});