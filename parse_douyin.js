const fs = require('fs')
const data = JSON.parse(fs.readFileSync('render_data.json', 'utf-8'))

let bestUrl = null;
let maxBitrate = 0;
let urlCount = 0;

function searchObj(obj) {
  if (!obj || typeof obj !== 'object') return;
  
  if (obj.bit_rate && Array.isArray(obj.bit_rate)) {
      for (const br of obj.bit_rate) {
        if (br.play_addr && br.play_addr.url_list && br.play_addr.url_list.length > 0) {
            urlCount++;
            console.log('Found quality:', br.bit_rate, 'URL:', br.play_addr.url_list[0])
            if (br.bit_rate > maxBitrate) {
              maxBitrate = br.bit_rate;
              bestUrl = br.play_addr.url_list[0];
            }
        }
      }
  }
  for (const key in obj) {
      if (typeof obj[key] === 'object') {
        searchObj(obj[key]);
      }
  }
}

searchObj(data);
console.log('Total URLs found:', urlCount)
console.log('BEST:', bestUrl)
