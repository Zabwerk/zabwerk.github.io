var fs = require('fs');

var dir = 'F:/blog/source/visited-cities/';
var files = fs.readdirSync(dir).filter(function(f) { return f.endsWith('.geojson'); });

var issues = [];

files.forEach(function(filename) {
    if (filename === 'China_province.geojson') return;
    
    try {
        var data = JSON.parse(fs.readFileSync(dir + filename, 'utf8'));
        
        if (!data.features || !Array.isArray(data.features)) {
            issues.push(filename + ': no features array');
            return;
        }
        
        data.features.forEach(function(feature, idx) {
            if (!feature.geometry) {
                issues.push(filename + '[' + idx + ']: no geometry');
                return;
            }
            
            var type = feature.geometry.type;
            var coords = feature.geometry.coordinates;
            
            if (!coords || coords.length === 0) {
                issues.push(filename + '[' + idx + ']: empty coordinates, type=' + type);
                return;
            }
            
            if (type !== 'Polygon' && type !== 'MultiPolygon') {
                issues.push(filename + '[' + idx + ']: unexpected type=' + type);
                return;
            }
            
            // Check name property
            var name = feature.properties ? (feature.properties.name || feature.properties.NAME) : null;
            if (!name) {
                issues.push(filename + '[' + idx + ']: missing name property, type=' + type);
            }
            
            // Verify coordinate structure
            try {
                if (type === 'Polygon') {
                    // Should be: [[[lng,lat],...],...] - array of rings
                    if (!Array.isArray(coords[0]) || !Array.isArray(coords[0][0]) || typeof coords[0][0][0] !== 'number') {
                        issues.push(filename + '[' + idx + '] (' + name + '): Polygon coords structure mismatch');
                    }
                } else if (type === 'MultiPolygon') {
                    // Should be: [[[[lng,lat],...],...],...] - array of polygons, each with rings
                    if (!Array.isArray(coords[0]) || !Array.isArray(coords[0][0]) || !Array.isArray(coords[0][0][0]) || typeof coords[0][0][0][0] !== 'number') {
                        issues.push(filename + '[' + idx + '] (' + name + '): MultiPolygon coords structure mismatch, coords[0][0][0] type=' + typeof coords[0][0][0] + ', isArray=' + Array.isArray(coords[0][0][0]));
                    }
                }
            } catch(e) {
                issues.push(filename + '[' + idx + ']: coords check error - ' + e.message);
            }
        });
    } catch(e) {
        issues.push(filename + ': JSON parse error - ' + e.message.substring(0, 80));
    }
});

if (issues.length === 0) {
    console.log('All GeoJSON files are valid! No issues found.');
} else {
    console.log('Issues found: ' + issues.length);
    issues.forEach(function(i) { console.log('  - ' + i); });
}
