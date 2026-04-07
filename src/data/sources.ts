export const RSS_SOURCES = {
  'World': [
    { name: 'Reuters World', url: 'https://news.google.com/rss/search?q=when:24h+allinurl:reuters.com&hl=en-US&gl=US&ceid=US:en' },
    { name: 'BBC News', url: 'http://feeds.bbci.co.uk/news/world/rss.xml' },
    { name: 'Associated Press', url: 'https://news.google.com/rss/search?q=when:24h+allinurl:apnews.com&hl=en-US&gl=US&ceid=US:en' },
    { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
    { name: 'NYT World', url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml' },
    { name: 'The Guardian', url: 'https://news.google.com/rss/search?q=when:24h+allinurl:theguardian.com&hl=en-US&gl=US&ceid=US:en' },
    { name: 'Euronews', url: 'https://www.euronews.com/rss?level=theme&name=world' },
    { name: 'Deutsche Welle', url: 'https://www.dw.com/en/top-stories/rss' },
    { name: 'France 24', url: 'https://www.france24.com/en/rss' },
    { name: 'UN News', url: 'https://news.un.org/feed/subscribe/en/news/all/rss.xml' },
    { name: 'NPR', url: 'https://www.npr.org/rss/rss.php?id=1004' }
  ],
  'India': [
    { name: 'Times of India', url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms' },
    { name: 'The Hindu', url: 'https://www.thehindu.com/news/national/feeder/default.rss' },
    { name: 'Indian Express', url: 'https://indianexpress.com/feed/' },
    { name: 'NDTV', url: 'https://www.ndtv.com/rss' },
    { name: 'Moneycontrol IN', url: 'https://www.moneycontrol.com/rss/latestnews.xml' },
    { name: 'Hindustan Times', url: 'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml' },
    { name: 'Firstpost', url: 'https://www.firstpost.com/feed' },
    { name: 'Deccan Herald', url: 'https://www.deccanherald.com/rss/national.xml' },
    { name: 'India Today', url: 'https://www.indiatoday.in/rss/home' }
  ],
  'Tech': [
    { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
    { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
    { name: 'Wired', url: 'https://www.wired.com/feed/rss' },
    { name: 'VentureBeat', url: 'https://venturebeat.com/feed/' },
    { name: 'Engadget', url: 'https://www.engadget.com/rss.xml' },
    { name: 'The Next Web', url: 'https://thenextweb.com/feed/' },
    { name: 'CNET', url: 'https://www.cnet.com/rss/news/' },
    { name: 'ZDNet', url: 'https://www.zdnet.com/news/rss.xml' },
    { name: 'GeekWire', url: 'https://www.geekwire.com/feed/' },
    { name: 'MakeUseOf', url: 'https://www.makeuseof.com/feed/' },
    { name: 'MacRumors', url: 'https://www.macrumors.com/macrumors.xml' }
  ],
  'AI': [
    { name: 'OpenAI', url: 'https://openai.com/news/rss.xml' },
    { name: 'Google AI', url: 'https://blog.google/technology/ai/rss/' },
    { name: 'ML Mastery', url: 'https://machinelearningmastery.com/blog/feed/' },
    { name: 'Data Science', url: 'https://towardsdatascience.com/feed' },
    { name: 'NVIDIA', url: 'https://blogs.nvidia.com/feed/' },
    { name: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml' },
    { name: 'AWS ML', url: 'https://aws.amazon.com/blogs/machine-learning/feed/' },
    { name: 'TensorFlow', url: 'https://blog.tensorflow.org/feeds/posts/default' }
  ],
  'Science': [
    { name: 'Nature', url: 'https://www.nature.com/nature.rss' },
    { name: 'ScienceDaily', url: 'https://www.sciencedaily.com/rss/all.xml' },
    { name: 'Science News', url: 'https://www.sciencenews.org/feed' },
    { name: 'NASA', url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss' },
    { name: 'Phys.org', url: 'https://phys.org/rss-feed/' },
    { name: 'Scientific Am.', url: 'https://rss.sciam.com/ScientificAmerican-Global' },
    { name: 'New Scientist', url: 'https://www.newscientist.com/feed/home/' }
  ],
  'Business': [
    { name: 'MarketWatch', url: 'https://www.marketwatch.com/rss/topstories' },
    { name: 'CNBC', url: 'https://www.cnbc.com/id/10001147/device/rss/rss.html' },
    { name: 'Fortune', url: 'https://fortune.com/feed/' },
    { name: 'Forbes', url: 'https://www.forbes.com/business/feed/' },
    { name: 'Seeking Alpha', url: 'https://seekingalpha.com/feed.xml' },
    { name: 'Moneycontrol BIZ', url: 'https://www.moneycontrol.com/rss/business.xml' },
    { name: 'Bloomberg', url: 'https://news.google.com/rss/search?q=when:24h+allinurl:bloomberg.com&hl=en-US&gl=US&ceid=US:en' }
  ],
  'Sports': [
    { name: 'BBC Sport', url: 'http://feeds.bbci.co.uk/sport/rss.xml' },
    { name: 'Yahoo Sports', url: 'https://sports.yahoo.com/rss/' },
    { name: 'Sky Sports', url: 'https://www.skysports.com/rss/12040' },
    { name: 'CBS Sports', url: 'https://www.cbssports.com/rss/headlines' },
    { name: 'Cricbuzz', url: 'https://www.cricbuzz.com/rss-news' }
  ],
  'Entertainment': [
    { name: 'TMZ', url: 'https://www.tmz.com/rss.xml' },
    { name: 'Variety', url: 'https://variety.com/feed/' },
    { name: 'Rolling Stone', url: 'https://www.rollingstone.com/feed/' },
    { name: 'Billboard', url: 'https://www.billboard.com/feed/' },
    { name: 'Hollywood Rep.', url: 'https://www.hollywoodreporter.com/feed/' },
    { name: 'Deadline', url: 'https://deadline.com/feed/' }
  ],
  'Gaming': [
    { name: 'IGN', url: 'https://www.ign.com/rss' },
    { name: 'GameSpot', url: 'https://www.gamespot.com/feeds/mashup/' },
    { name: 'Polygon', url: 'https://www.polygon.com/rss/index.xml' },
    { name: 'Destructoid', url: 'https://www.destructoid.com/feed/' },
    { name: 'RPS', url: 'https://www.rockpapershotgun.com/feed' }
  ],
  'Programming': [
    { name: 'StackOverflow', url: 'https://stackoverflow.blog/feed/' },
    { name: 'GitHub', url: 'https://github.blog/feed/' },
    { name: 'Real Python', url: 'https://realpython.com/atom.xml' },
    { name: 'CSS-Tricks', url: 'https://css-tricks.com/feed/' },
    { name: 'Dev.to', url: 'https://dev.to/feed' },
    { name: 'Smashing Mag.', url: 'https://www.smashingmagazine.com/feed/' },
    { name: 'JetBrains', url: 'https://blog.jetbrains.com/feed/' },
    { name: 'freeCodeCamp', url: 'https://www.freecodecamp.org/news/rss/' },
    { name: 'Martin Fowler', url: 'https://martinfowler.com/feed.atom' }
  ],
  'Education': [
    { name: 'MIT OCW', url: 'https://ocw.mit.edu/feed/rss/' },
    { name: 'Open Culture', url: 'https://www.openculture.com/feed' },
    { name: 'Edutopia', url: 'https://www.edutopia.org/rss.xml' }
  ]
};

export const getFeedsForCategory = (category: string): { name: string; url: string }[] => {
  const upperCat = category.toUpperCase();
  
  // Direct match to keys (AI, WORLD, TECH, etc)
  const keys = Object.keys(RSS_SOURCES);
  const matchedKey = keys.find(k => k.toUpperCase() === upperCat);
  
  if (matchedKey) {
    return RSS_SOURCES[matchedKey as keyof typeof RSS_SOURCES];
  }

  // Grouped logic/Synonyms
  if (upperCat === 'TRENDING' || upperCat === 'BREAKING NEWS') {
     return [
       ...RSS_SOURCES['World'].slice(0, 2), 
       ...RSS_SOURCES['Tech'].slice(0, 2),
       ...RSS_SOURCES['India'].slice(0, 1),
       ...RSS_SOURCES['AI']?.slice(0, 1) || []
     ];
  }

  if (upperCat === 'FINANCE') {
    return RSS_SOURCES['Business'];
  }
  
  // Strict fallback to World only if absolutely unknown
  return RSS_SOURCES['World'];
};
