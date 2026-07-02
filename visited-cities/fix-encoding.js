var fs = require('fs');
var path = require('path');
var iconv = require('iconv-lite');

var dir = __dirname;

var testFile = path.join(dir, '广东省.geojson');
var buffer = fs.readFileSync(testFile);
console.log('File size:', buffer.length);
console.log('First 50 bytes:', buffer.slice(0, 50).toString('hex'));
console.log('First 100 chars as UTF-8:', buffer.toString('utf8').substring(0, 100));
console.log('First 100 chars as GBK:', iconv.decode(buffer.slice(0, 300), 'GBK'));

function hasUtf8Bom(buffer) {
    return buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF;
}

function detectEncoding(buffer) {
    var str = buffer.toString('utf8');
    if (hasUtf8Bom(buffer)) {
        return 'utf8-bom';
    }
    if (str.includes('\ufffd')) {
        return 'likely-gbk';
    }
    return 'utf8';
}

fs.readdirSync(dir).forEach(function(file) {
    if (file.endsWith('.geojson') && file !== 'China_province.geojson') {
        var filePath = path.join(dir, file);
        var buffer = fs.readFileSync(filePath);
        var encoding = detectEncoding(buffer);
        console.log('File:', file, '- Detected:', encoding);
        
        var content;
        if (encoding === 'utf8-bom') {
            content = buffer.slice(3).toString('utf8');
        } else if (encoding === 'likely-gbk') {
            content = iconv.decode(buffer, 'GBK');
        } else {
            content = buffer.toString('utf8');
        }
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Fixed:', file);
    }
});

console.log('Done!');