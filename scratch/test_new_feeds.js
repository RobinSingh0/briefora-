const RSSParser = require("rss-parser");

const parser = new RSSParser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml;q=0.9, */*;q=0.8'
  },
});

const FEEDS_TO_TEST = {
  'ENTERTAINMENT': [
    {'name': 'Variety', 'url': 'https://variety.com/feed/'},
    {'name': 'Hollywood Reporter', 'url': 'https://www.hollywoodreporter.com/feed/'}
  ],
  'PROGRAMMING': [
    {'name': 'Dev.to', 'url': 'https://dev.to/feed'},
    {'name': 'StackOverflow', 'url': 'https://stackoverflow.blog/feed/'}
  ],
  'EDUCATION': [
    {'name': 'MIT News', 'url': 'https://news.mit.edu/rss/topic/education-hub'}
  ]
};

async function testNewFeeds() {
  for (const cat in FEEDS_TO_TEST) {
    console.log(`\nTesting Category: ${cat}`);
    for (const feed of FEEDS_TO_TEST[cat]) {
      try {
        const res = await parser.parseURL(feed.url);
        console.log(`  ✅ ${feed.name}: Found ${res.items.length} items. First: ${res.items[0]?.title}`);
      } catch (err) {
        console.log(`  ❌ ${feed.name}: FAILED - ${err.message}`);
      }
    }
  }
}

testNewFeeds();
