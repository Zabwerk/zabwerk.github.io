const fs = require('fs');

const geoJson = JSON.parse(fs.readFileSync('f:\\blog\\source\\visited-cities\\China_province.geojson', 'utf8'));

const provinceMap = {};

const minLon = 73.5;
const maxLon = 135.0;
const minLat = 18.0;
const maxLat = 54.5;

const width = 1500;
const height = 1200;

function lonLatToXY(lon, lat) {
    const x = ((lon - minLon) / (maxLon - minLon)) * width;
    const y = ((maxLat - lat) / (maxLat - minLat)) * height;
    return { x, y };
}

function coordsToPath(coords) {
    let path = '';
    coords.forEach((ring, ringIndex) => {
        ring.forEach((coord, coordIndex) => {
            const { x, y } = lonLatToXY(coord[0], coord[1]);
            if (ringIndex === 0 && coordIndex === 0) {
                path += 'M ' + x + ' ' + y + ' ';
            } else {
                path += 'L ' + x + ' ' + y + ' ';
            }
        });
        path += 'Z ';
    });
    return path.trim();
}

geoJson.features.forEach(feature => {
    const name = feature.properties.name;
    const geometry = feature.geometry;
    
    let path = '';
    if (geometry.type === 'Polygon') {
        path = coordsToPath(geometry.coordinates);
    } else if (geometry.type === 'MultiPolygon') {
        geometry.coordinates.forEach(polygon => {
            path += coordsToPath(polygon) + ' ';
        });
    }
    
    provinceMap[name] = {
        name: name,
        path: path.trim()
    };
});

const simplifiedNames = {
    '北京市': '北京',
    '天津市': '天津',
    '河北省': '河北',
    '山西省': '山西',
    '内蒙古自治区': '内蒙古',
    '辽宁省': '辽宁',
    '吉林省': '吉林',
    '黑龙江省': '黑龙江',
    '上海市': '上海',
    '江苏省': '江苏',
    '浙江省': '浙江',
    '安徽省': '安徽',
    '福建省': '福建',
    '江西省': '江西',
    '山东省': '山东',
    '河南省': '河南',
    '湖北省': '湖北',
    '湖南省': '湖南',
    '广东省': '广东',
    '广西壮族自治区': '广西',
    '海南省': '海南',
    '重庆市': '重庆',
    '四川省': '四川',
    '贵州省': '贵州',
    '云南省': '云南',
    '西藏自治区': '西藏',
    '陕西省': '陕西',
    '甘肃省': '甘肃',
    '青海省': '青海',
    '宁夏回族自治区': '宁夏',
    '新疆维吾尔自治区': '新疆',
    '香港特别行政区': '香港',
    '澳门特别行政区': '澳门',
    '台湾省': '台湾'
};

const simplifiedMap = {};
Object.keys(provinceMap).forEach(fullName => {
    const shortName = simplifiedNames[fullName] || fullName;
    simplifiedMap[shortName] = provinceMap[fullName];
});

fs.writeFileSync('f:\\blog\\source\\visited-cities\\provinceMap.js', 
    'var provinceMap = ' + JSON.stringify(simplifiedMap, null, 2) + ';'
);

console.log('provinceMap.js created successfully!');
console.log('Total provinces:', Object.keys(simplifiedMap).length);
console.log('Provinces:', Object.keys(simplifiedMap).join(', '));