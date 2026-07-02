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

var testFiles = [
    '安徽省.geojson', '天津市.geojson', '北京市.geojson', 
    '台湾省.geojson', '广东省.geojson', '四川省.geojson',
    '新疆维吾尔自治区.geojson', '内蒙古自治区.geojson'
];

testFiles.forEach(function(filename) {
    try {
        var data = JSON.parse(fs.readFileSync('F:/blog/source/visited-cities/' + filename, 'utf8'));
        console.log('=== ' + filename + ' ===');
        console.log('Features: ' + data.features.length);
        
        var totalPaths = 0;
        var errors = [];
        var emptyPaths = 0;
        
        data.features.forEach(function(feature, idx) {
            var name = feature.properties ? (feature.properties.name || feature.properties.NAME || '?') : '?';
            try {
                var pathStr = geoToPath(feature.geometry.coordinates);
                if (!pathStr || pathStr.trim() === '') {
                    emptyPaths++;
                    errors.push('  Feature "' + name + '": EMPTY path');
                } else {
                    totalPaths++;
                    if (pathStr.indexOf('NaN') >= 0) {
                        errors.push('  Feature "' + name + '": NaN in path');
                    }
                    if (pathStr.indexOf('Infinity') >= 0) {
                        errors.push('  Feature "' + name + '": Infinity in path');
                    }
                    if (idx < 3) {
                        console.log('  [' + idx + '] ' + name + ': ' + pathStr.substring(0, 200) + '...');
                    }
                }
            } catch(e) {
                errors.push('  Feature "' + name + '": ERROR - ' + e.message);
            }
        });
        
        console.log('Total valid paths: ' + totalPaths + ', empty: ' + emptyPaths + ', errors: ' + errors.length);
        if (errors.length > 0) {
            errors.forEach(function(e) { console.log(e); });
        }
        console.log('');
    } catch(e) {
        console.log(filename + ': PARSE ERROR - ' + e.message.substring(0, 100));
        console.log('');
    }
});
