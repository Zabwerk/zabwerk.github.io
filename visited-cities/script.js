'use strict';

// ==================== Morandi 色板（深浅双模式共用） ====================
var levelNames = ['没去过', '路过', '出差', '游玩', '短居', '居住'];

var color, highlightColor, strokeColor;

function isDarkMode() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
}

function getPalette() {
    // 莫兰迪色系 level 0→5：灰、蓝、绿、黄、橙、红
    var morandi = {
        color:          ['#c9bfb1', '#82899a', '#7f8f76', '#b89458', '#a96c3e', '#8a4a3b'],
        highlightColor: ['#e0d7ca', '#9da5b8', '#95a58a', '#cbaa6c', '#bd8658', '#a05f4e']
    };
    return {
        color: morandi.color,
        highlightColor: morandi.highlightColor,
        stroke: isDarkMode() ? '#1a1a1a' : '#fff'
    };
}

function updatePalette() {
    var p = getPalette();
    color = p.color;
    highlightColor = p.highlightColor;
    strokeColor = p.stroke;
}

var visited = {};
var map;
var currentLevel = 'province';
var currentProvince = null;

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

function saveVisited(data) {
    try {
        localStorage.setItem('visited-cities-levels', JSON.stringify(data));
    } catch (e) {}
}

function getProvinceLevel(provinceName) {
    var cities = getCitiesInProvince(provinceName);
    var maxLevel = 0;
    cities.forEach(city => {
        if (visited[city] && visited[city] > maxLevel) {
            maxLevel = visited[city];
        }
    });
    return maxLevel;
}

function getCitiesInProvince(provinceName) {
    var cities = [];
    for (var city in cityProvinceMap) {
        if (cityProvinceMap[city] === provinceName) {
            cities.push(city);
        }
    }
    return cities;
}

// ---------------- 响应式画布尺寸（取 #vc-map 容器实际大小，否则回退 1450x755） ----------------
function getCanvasSize() {
    var el = document.getElementById('vc-map');
    if (!el) return { w: 1450, h: 755 };
    var w = el.clientWidth  || 1450;
    var h = Math.round(w * 755 / 1450);
    return { w: w, h: h };
}

function renderProvinceMap() {
    var size = getCanvasSize();
    clearMap();
    currentLevel = 'province';
    currentProvince = null;

    document.getElementById('vc-backBtn').style.display = 'none';

    var baseAttr = {
        "stroke": strokeColor,
        "stroke-opacity": "1",
        "stroke-linejoin": "round",
        "stroke-miterlimit": "4",
        "stroke-width": "0.75",
        "stroke-dasharray": "none"
    };

    var tooltip = document.getElementById('vc-tooltip');

    var scaleX = size.w / 1500;
    var scaleY = size.h / 1200;
    var scale = Math.min(scaleX, scaleY);
    var offsetX = (size.w - 1500 * scale) / 2;
    var offsetY = (size.h - 1200 * scale) / 2;

    for (var key in provinceMap) {
        var province = provinceMap[key];
        var level = getProvinceLevel(key);

        var graph = map.path(province.path);
        graph.attr(baseAttr);
        graph.attr({fill: color[level]});
        graph.transform('S' + scale + ',' + scale + ',' + offsetX + ',' + offsetY);

        (function (g, name, lv) {
            var baseT = g.transform() || '';
            var bbox = g.getBBox();
            var cx = bbox.x + bbox.width / 2;
            var cy = bbox.y + bbox.height / 2;

            g.node.onmouseover = function (e) {
                g.transform(baseT + ' s1.02,' + cx + ',' + cy);
                g.attr({fill: highlightColor[lv]});
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
                g.attr({fill: color[lv]});
                tooltip.style.display = 'none';
            };
            g.node.onclick = function () {
                renderCityMap(name);
            };
        })(graph, province.name, level);
    }
}

function geoToPath(coordinates, transform) {
    var paths = [];
    transform = transform || function(x, y) { return {x: x, y: y}; };

    function processRing(ring) {
        var path = '';
        ring.forEach(function(coord, i) {
            var p = transform(coord[0], coord[1]);
            if (i === 0) {
                path += 'M ' + p.x + ' ' + p.y;
            } else {
                path += ' L ' + p.x + ' ' + p.y;
            }
        });
        path += ' Z';
        return path;
    }

    function processPolygon(polygon) {
        polygon.forEach(function(ring) {
            paths.push(processRing(ring));
        });
    }

    function processCoordinates(coords) {
        if (coords.length > 0 && typeof coords[0][0] === 'number') {
            paths.push(processRing(coords));
        } else if (coords.length > 0 && typeof coords[0][0][0] === 'number') {
            processPolygon(coords);
        } else if (coords.length > 0 && Array.isArray(coords[0][0][0])) {
            coords.forEach(function(polygon) {
                processPolygon(polygon);
            });
        }
    }

    processCoordinates(coordinates);
    return paths.join(' ');
}

function renderCityMap(provinceName) {
    var size = getCanvasSize();
    clearMap();
    currentLevel = 'city';
    currentProvince = provinceName;

    document.getElementById('vc-backBtn').style.display = 'inline-flex';

    var baseAttr = {
        "stroke": strokeColor,
        "stroke-opacity": "1",
        "stroke-linejoin": "round",
        "stroke-miterlimit": "4",
        "stroke-width": "0.75",
        "stroke-dasharray": "none"
    };

    var tooltip = document.getElementById('vc-tooltip');
    var geoJsonPath = '/visited-cities/' + encodeURIComponent(provinceName) + '.geojson';

    fetch(geoJsonPath)
        .then(function(response) {
            if (!response.ok) {
                throw new Error('Failed to load GeoJSON');
            }
            return response.json();
        })
        .then(function(data) {
            var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

            data.features.forEach(function(feature) {
                var coords = feature.geometry.coordinates;
                function collectCoords(arr) {
                    arr.forEach(function(item) {
                        if (Array.isArray(item[0])) {
                            collectCoords(item);
                        } else {
                            minX = Math.min(minX, item[0]);
                            minY = Math.min(minY, item[1]);
                            maxX = Math.max(maxX, item[0]);
                            maxY = Math.max(maxY, item[1]);
                        }
                    });
                }
                collectCoords(coords);
            });

            var padding = 80;
            var width = maxX - minX;
            var height = maxY - minY;
            var canvasWidth = size.w;
            var canvasHeight = size.h;
            var scaleX = (canvasWidth - padding * 2) / width;
            var scaleY = (canvasHeight - padding * 2) / height;
            var scale = Math.min(scaleX, scaleY);

            var scaledWidth = width * scale;
            var scaledHeight = height * scale;
            var offsetX = (canvasWidth - scaledWidth) / 2;
            var offsetY = (canvasHeight - scaledHeight) / 2;

            var transform = function(x, y) {
                return {
                    x: (x - minX) * scale + offsetX,
                    y: (maxY - y) * scale + offsetY
                };
            };

            data.features.forEach(function(feature) {
                if (!feature.properties) {
                    return;
                }
                var cityName = (feature.properties.name || feature.properties.NAME || '').replace(/市$/, '');
                var level = visited[cityName] || 0;
                var pathStr = geoToPath(feature.geometry.coordinates, transform);

                var graph = map.path(pathStr);
                graph.attr(baseAttr);
                graph.attr({fill: color[level]});

                (function (g, name, lv) {
                    var baseT = g.transform() || '';
                    var bbox = g.getBBox();
                    var cx = bbox.x + bbox.width / 2;
                    var cy = bbox.y + bbox.height / 2;

                    g.node.onmouseover = function (e) {
                        g.transform(baseT + ' s1.02,' + cx + ',' + cy);
                        g.attr({fill: highlightColor[lv]});
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
                        g.attr({fill: color[lv]});
                        tooltip.style.display = 'none';
                    };
                })(graph, cityName, level);
            });
        })
        .catch(function(error) {
            console.error('Error loading province GeoJSON:', error);
            var errorText = map.text(size.w / 2, size.h / 2, '加载失败，请返回重试');
            errorText.attr({fill: color[5], 'font-size': 20});
        });
}

function clearMap() {
    map.clear();
}

function goBack() {
    renderProvinceMap();
}

// ---------------- 启动：DOM 就绪后初始化 Raphael 画布并绑定事件 ----------------
function vcInit() {
    updatePalette();
    visited = buildVisited();
    saveVisited(visited);

    var size = getCanvasSize();
    map = new Raphael('vc-map', size.w, size.h);

    // 图例行着色（JS 动态兜底，与 CSS 变量保持一致）
    Array.from(document.querySelectorAll('#vc-legend tr.select')).forEach(function (el) {
        var lv = el.getAttribute('data-level');
        if (color[lv]) el.style.backgroundColor = color[lv];
    });

    document.getElementById('vc-backBtn').addEventListener('click', goBack);

    renderProvinceMap();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', vcInit);
} else {
    vcInit();
}

// 窗口尺寸变化 → 重新绘制
(function () {
    var timer = null;
    window.addEventListener('resize', function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
            if (!map) return;
            var size = getCanvasSize();
            map.setSize(size.w, size.h);
            if (currentLevel === 'province') {
                renderProvinceMap();
            } else if (currentProvince) {
                renderCityMap(currentProvince);
            }
        }, 180);
    });
})();

// 主题切换（深/浅色）→ 更新色板并重绘地图
(function () {
    if (typeof MutationObserver === 'undefined') return;
    var observer = new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
            if (mutations[i].attributeName === 'data-theme') {
                updatePalette();
                // 更新图例底色
                Array.from(document.querySelectorAll('#vc-legend tr.select')).forEach(function (el) {
                    var lv = el.getAttribute('data-level');
                    if (color[lv]) el.style.backgroundColor = color[lv];
                });
                // 重绘地图
                if (currentLevel === 'province') {
                    renderProvinceMap();
                } else if (currentProvince) {
                    renderCityMap(currentProvince);
                }
                break;
            }
        }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
