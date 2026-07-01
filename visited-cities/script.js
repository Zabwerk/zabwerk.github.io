'use strict';

// 颜色: 0=没去过  1=路过  2=出差  3=游玩  4=短居  5=居住
var color = ['#d3d3d3', '#3598db', '#30cc70', '#f3c218', '#d58337', '#e84c3d'];
var levelNames = ['没去过', '路过', '出差', '游玩', '短居', '居住'];

// 城市等级配置在 visited-config.js 中编辑

// ========== 构建完整城市等级表（代码为唯一权威来源） ==========
function buildVisited() {
    var result = {};

    // 所有城市默认 0
    for (var key in chinaMap) {
        result[key] = 0;
    }

    // 代码默认值
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

// ========== 页面加载 ==========
window.onload = function () {
    var visited = buildVisited();
    saveVisited(visited);

    var map = new Raphael('map', 1500, 1200);

    var baseAttr = {
        "stroke": "#fff",
        "stroke-opacity": "1",
        "stroke-linejoin": "round",
        "stroke-miterlimit": "4",
        "stroke-width": "0.75",
        "stroke-dasharray": "none"
    };

    var tooltip = document.getElementById('tooltip');

    for (var key in chinaMap) {
        var city = chinaMap[key];
        var level = visited[key] || 0;
        city.level = level;

        var graph = map.path(city.path).scale(1.8, 2, 0, 2);
        graph.attr(baseAttr);
        graph.attr({fill: color[level]});
        city.graph = graph;

        // 悬浮显示城市名和占领状态 + 放大 2%
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
    Array.from(document.getElementsByClassName('select')).forEach(function (el) {
        el.style.backgroundColor = color[el.getAttribute('data-level')];
    });
};
