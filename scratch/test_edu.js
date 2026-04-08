const RSSParser = require("rss-parser");
const parser = new RSSParser();

async function test() {
  const feeds = [
    'https://www.edutopia.org/rss.xml',
    'https://www.openculture.com/feed'
  ];
  for (const f of feeds) {
    try {
      const res = await parser.parseURL(f);
      console.log(`✅ SUCCESS ${f}: ${res.items.length} items.`);
    } catch (e) {
      console.log(`❌ FAIL ${f}: ${e.message}`);
    }
  }
}
test();
