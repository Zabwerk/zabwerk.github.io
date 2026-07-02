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

var dir = 'F:/blog/source/visited-cities/';
var files = fs.readdirSync(dir).filter(function(f) { 
    return f.endsWith('.geojson') && f !== 'China_province.geojson'; 
});

var allGood = [];
var withIssues = [];

files.forEach(function(filename) {
    var data = JSON.parse(fs.readFileSync(dir + filename, 'utf8'));
    
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
    
    var issues = [];
    
    data.features.forEach(function(feature, idx) {
        var name = feature.properties ? (feature.properties.name || feature.properties.NAME || '?') : '?';
        var type = feature.geometry.type;
        
        try {
            var pathStr = geoToPath(feature.geometry.coordinates, transform);
            
            if (!pathStr || pathStr.trim() === '') {
                issues.push('  [' + idx + '] ' + name + ' (' + type + '): EMPTY PATH');
            } else if (pathStr.indexOf('NaN') >= 0 || pathStr.indexOf('Infinity') >= 0) {
                issues.push('  [' + idx + '] ' + name + ' (' + type + '): NaN/Infinity in path');
            }
        } catch(e) {
            issues.push('  [' + idx + '] ' + name + ' (' + type + '): ERROR - ' + e.message);
        }
    });
    
    if (issues.length > 0) {
        withIssues.push({file: filename, issues: issues});
    } else {
        allGood.push(filename);
    }
});

console.log('=== Results ===');
console.log('OK: ' + allGood.length + ' files');
console.log('With issues: ' + withIssues.length + ' files');
console.log('');

if (withIssues.length > 0) {
    withIssues.forEach(function(item) {
        console.log(item.file + ':');
        item.issues.forEach(function(i) { console.log(i); });
        console.log('');
    });
}

// Check for provinces with very few features or special structure
console.log('=== Feature counts ===');
files.forEach(function(filename) {
    var data = JSON.parse(fs.readFileSync(dir + filename, 'utf8'));
    var name = filename.replace('.geojson', '');
    var types = [...new Set(data.features.map(function(f) { return f.geometry.type; }))];
    if (data.features.length <= 1 || types.length > 1) {
        console.log(name + ': ' + data.features.length + ' features, types: ' + types.join(', '));
    }
});
