var fs = require('fs');

var topojson = JSON.parse(fs.readFileSync('台湾.json', 'utf8'));

function decodeArc(arcIndex) {
    var transform = topojson.transform;
    var scale = transform.scale;
    var translate = transform.translate;
    var arcs = topojson.arcs;
    
    var arc = arcs[Math.abs(arcIndex)];
    if (!arc) return [];
    
    var points = [];
    var x = 0, y = 0;
    
    arc.forEach(function(delta) {
        x += delta[0];
        y += delta[1];
        points.push([
            x * scale[0] + translate[0],
            y * scale[1] + translate[1]
        ]);
    });
    
    if (arcIndex < 0) {
        points.reverse();
    }
    
    return points;
}

function decodeRing(ringArcs) {
    var points = [];
    ringArcs.forEach(function(arcIndex) {
        var arcPoints = decodeArc(arcIndex);
        if (arcPoints.length > 0) {
            if (points.length > 0) {
                arcPoints.shift();
            }
            points = points.concat(arcPoints);
        }
    });
    return points;
}

function decodePolygon(polygonArcs) {
    return polygonArcs.map(function(ringArcs) {
        return decodeRing(ringArcs);
    });
}

var features = [];

topojson.objects.map.geometries.forEach(function(geom) {
    var coordinates;
    
    if (geom.type === 'Polygon') {
        coordinates = decodePolygon(geom.arcs);
    } else if (geom.type === 'MultiPolygon') {
        coordinates = geom.arcs.map(function(polygonArcs) {
            return decodePolygon(polygonArcs);
        });
    }
    
    features.push({
        type: 'Feature',
        properties: {
            name: geom.properties.name
        },
        geometry: {
            type: geom.type,
            coordinates: coordinates
        }
    });
});

var geojson = {
    type: 'FeatureCollection',
    features: features
};

fs.writeFileSync('台湾省.geojson', JSON.stringify(geojson, null, 2), 'utf8');
console.log('台湾省.geojson generated successfully');
