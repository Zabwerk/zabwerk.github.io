var fs = require('fs');

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

var testFiles = ['安徽省.geojson', '内蒙古自治区.geojson', '北京市.geojson', '天津市.geojson'];

testFiles.forEach(function(filename) {
    var data = JSON.parse(fs.readFileSync('F:/blog/source/visited-cities/' + filename, 'utf8'));
    console.log('=== ' + filename + ' ===');
    
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
    
    console.log('Bounds: [' + minX.toFixed(6) + ', ' + minY.toFixed(6) + '] to [' + maxX.toFixed(6) + ', ' + maxY.toFixed(6) + ']');
    console.log('Size: ' + width.toFixed(6) + ' x ' + height.toFixed(6));
    console.log('Scale: ' + scale.toFixed(6) + ' (scaleX=' + scaleX.toFixed(6) + ', scaleY=' + scaleY.toFixed(6) + ')');
    
    var scaledWidth = width * scale;
    var scaledHeight = height * scale;
    var offsetX = (canvasWidth - scaledWidth) / 2;
    var offsetY = (canvasHeight - scaledHeight) / 2;
    
    console.log('Scaled: ' + scaledWidth.toFixed(2) + ' x ' + scaledHeight.toFixed(2));
    console.log('Offset: ' + offsetX.toFixed(2) + ', ' + offsetY.toFixed(2));
    
    var transform = function(x, y) {
        return {
            x: (x - minX) * scale + offsetX,
            y: (maxY - y) * scale + offsetY
        };
    };
    
    // Check if any feature produces out-of-bounds coordinates
    var outOfBounds = [];
    var emptyFeatures = [];
    var nanFeatures = [];
    
    data.features.forEach(function(feature, idx) {
        var name = feature.properties ? (feature.properties.name || feature.properties.NAME || '?') : '?';
        var pathStr = geoToPath(feature.geometry.coordinates, transform);
        
        if (!pathStr || pathStr.trim() === '') {
            emptyFeatures.push(name);
        } else if (pathStr.indexOf('NaN') >= 0) {
            nanFeatures.push(name);
        }
        
        // Check if coordinates are within canvas
        var coords = feature.geometry.coordinates;
        function checkCoords(arr) {
            arr.forEach(function(item) {
                if (Array.isArray(item[0])) {
                    checkCoords(item);
                } else {
                    var p = transform(item[0], item[1]);
                    if (p.x < -100 || p.x > canvasWidth + 100 || p.y < -100 || p.y > canvasHeight + 100) {
                        outOfBounds.push(name + ': (' + p.x.toFixed(2) + ', ' + p.y.toFixed(2) + ')');
                    }
                }
            });
        }
        checkCoords(coords);
    });
    
    console.log('Features: ' + data.features.length);
    if (emptyFeatures.length > 0) console.log('Empty features: ' + emptyFeatures.join(', '));
    if (nanFeatures.length > 0) console.log('NaN features: ' + nanFeatures.join(', '));
    if (outOfBounds.length > 0) {
        console.log('Out-of-bounds (first 5):');
        outOfBounds.slice(0, 5).forEach(function(o) { console.log('  ' + o); });
        console.log('Total out-of-bounds: ' + outOfBounds.length);
    } else {
        console.log('All coordinates within bounds.');
    }
    console.log('');
});
