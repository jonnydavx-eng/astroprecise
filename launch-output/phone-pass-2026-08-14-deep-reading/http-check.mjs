import http from 'node:http';
const url = process.argv[2] || 'http://127.0.0.1:8790/deep-reading.html?nosw=1';
http.get(url, (res) => {
  let d = '';
  res.on('data', (c) => { d += c; if (d.length > 8000) res.destroy(); });
  res.on('end', () => {
    console.log('STATUS=' + res.statusCode);
    console.log('LEN=' + d.length);
    console.log('TITLE=' + /<title>([^<]+)/.test(d) ? RegExp.$1 : 'none');
    console.log('HAS_PHONE_CSS=' + /ap-phone-pass/.test(d));
    console.log('HAS_NATAL=' + /page-natal-reading/.test(d));
    console.log('HAS_ORR=' + /void-orrery/.test(d));
  });
  res.on('error', (e) => console.log('ERR=' + e.message));
}).on('error', (e) => {
  console.log('ERR=' + e.message);
  process.exit(1);
});
