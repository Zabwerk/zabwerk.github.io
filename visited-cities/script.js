'use strict';

var color = ['#d3d3d3', '#3598db', '#30cc70', '#f4d03f', '#d58337', '#a93226'];
var highlightColor = ['#ededed', '#00a8ff', '#59f44c', '#ffd706', '#f39c12', '#e74c3c'];
var levelNames = ['没去过', '路过', '出差', '游玩', '短居', '居住'];

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

function renderProvinceMap() {
    clearMap();
    currentLevel = 'province';
    currentProvince = null;
    
    document.getElementById('backBtn').style.display = 'none';
    document.getElementById('currentLocation').textContent = '中国地图';
    
    var baseAttr = {
        "stroke": "#fff",
        "stroke-opacity": "1",
        "stroke-linejoin": "round",
        "stroke-miterlimit": "4",
        "stroke-width": "0.75",
        "stroke-dasharray": "none"
    };

    var tooltip = document.getElementById('tooltip');
    
    var scaleX = 1450 / 1500;
    var scaleY = 755 / 1200;
    var scale = Math.min(scaleX, scaleY);
    var offsetX = (1450 - 1500 * scale) / 2;
    var offsetY = (755 - 1200 * scale) / 2;

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
            // MultiPolygon: coordinates is an array of polygons
            coords.forEach(function(polygon) {
                processPolygon(polygon);
            });
        }
    }
    
    processCoordinates(coordinates);
    return paths.join(' ');
}

function renderCityMap(provinceName) {
    clearMap();
    currentLevel = 'city';
    currentProvince = provinceName;
    
    document.getElementById('backBtn').style.display = 'block';
    document.getElementById('currentLocation').textContent = provinceName + ' - 市级地图';
    
    var baseAttr = {
        "stroke": "#fff",
        "stroke-opacity": "1",
        "stroke-linejoin": "round",
        "stroke-miterlimit": "4",
        "stroke-width": "0.75",
        "stroke-dasharray": "none"
    };

    var tooltip = document.getElementById('tooltip');
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
            var canvasWidth = 1450;
            var canvasHeight = 755;
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
            var errorText = map.text(600, 500, '加载失败，请返回重试');
            errorText.attr({fill: '#e84c3d', 'font-size': 20});
        });
}

function clearMap() {
    map.clear();
}

function goBack() {
    renderProvinceMap();
}

window.onload = function () {
    visited = buildVisited();
    saveVisited(visited);

    map = new Raphael('map', 1450, 755);
    
    Array.from(document.getElementsByClassName('select')).forEach(function (el) {
        el.style.backgroundColor = color[el.getAttribute('data-level')];
    });
    
    document.getElementById('backBtn').addEventListener('click', goBack);
    document.getElementById('homeBtn').addEventListener('click', function() {
        window.location.href = '/';
    });
    
    renderProvinceMap();
};