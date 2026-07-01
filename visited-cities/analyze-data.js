const fs = require('fs');

const data = fs.readFileSync('f:\\blog\\source\\visited-cities\\ChinaMapData.js', 'utf8');

const matches = data.match(/"([^"]+)":\s*\{/g);
console.log('Total entries:', matches ? matches.length : 0);

const keys = matches.map(m => m.match(/"([^"]+)"/)[1]);
console.log('First 50 keys:', keys.slice(0, 50).join(', '));
console.log('Last 20 keys:', keys.slice(-20).join(', '));