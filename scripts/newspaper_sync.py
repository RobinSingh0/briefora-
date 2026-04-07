import feedparser
import newspaper
from newspaper import Article, Config
import firebase_admin
from firebase_admin import credentials, firestore
import base64
import re
import os
import time
import json
import random
import requests
from bs4 import BeautifulSoup
import trafilatura
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# --- Configuration ---
SERVICE_ACCOUNT_PATH = os.path.join(os.path.dirname(__file__), "..", "service-account.json")
COLLECTION_NAME = "news"
GOOGLEBOT_UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"

# RSS Sources (Matching sources.ts)
RSS_SOURCES = {
    'World': [
        {'name': 'Reuters World', 'url': 'https://news.google.com/rss/search?q=when:24h+allinurl:reuters.com&hl=en-US&gl=US&ceid=US:en'},
        {'name': 'BBC News', 'url': 'http://feeds.bbci.co.uk/news/world/rss.xml'},
        {'name': 'Associated Press', 'url': 'https://news.google.com/rss/search?q=when:24h+allinurl:apnews.com&hl=en-US&gl=US&ceid=US:en'},
        {'name': 'Al Jazeera', 'url': 'https://www.aljazeera.com/xml/rss/all.xml'},
        {'name': 'NYT World', 'url': 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml'},
        {'name': 'The Guardian', 'url': 'https://news.google.com/rss/search?q=when:24h+allinurl:theguardian.com&hl=en-US&gl=US&ceid=US:en'},
        {'name': 'Globalnews', 'url': 'https://www.globalnews.ca/world/feed/'},
        {'name': 'ABCnews', 'url': 'https://abcnews.go.com/abcnews/internationalheadlines'},
        {'name': 'France 24', 'url': 'https://www.france24.com/en/rss'},
        {'name': 'Washingtontimes', 'url': 'https://www.washingtontimes.com/rss/headlines/news/world/'},
        {'name': 'Skynews', 'url': 'https://feeds.skynews.com/feeds/rss/world.xml'}
    ],
    'India': [
        {'name': 'Times of India', 'url': 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms'},
        {'name': 'The Hindu', 'url': 'https://www.thehindu.com/news/national/feeder/default.rss'},
        {'name': 'Indian Express', 'url': 'https://indianexpress.com/feed/'},
        {'name': 'NDTV', 'url': 'https://feeds.feedburner.com/ndtvnews-top-stories'},
        {'name': 'Moneycontrol IN', 'url': 'https://www.moneycontrol.com/rss/latestnews.xml'},
        {'name': 'Hindustan Times', 'url': 'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml'},
        {'name': 'Firstpost', 'url': 'https://www.firstpost.com/commonfeeds/v1/mfp/rss/india.xml'},
        {'name': 'One India', 'url': 'https://www.oneindia.com/rss/feeds/news-india-fb.xml'},
        {'name': 'India Today', 'url': 'https://www.indiatoday.in/rss/home'}
    ],
    'Tech': [
        {'name': 'TechCrunch', 'url': 'https://techcrunch.com/feed/'},
        {'name': 'The Verge', 'url': 'https://www.theverge.com/rss/index.xml'},
        {'name': 'Wired', 'url': 'https://www.wired.com/feed/rss'},
        {'name': 'VentureBeat', 'url': 'https://venturebeat.com/feed/'},
        {'name': 'Engadget', 'url': 'https://www.engadget.com/rss.xml'},
        {'name': 'The Next Web', 'url': 'https://thenextweb.com/feed/'},
        {'name': 'CNET', 'url': 'https://www.cnet.com/rss/news/'},
        {'name': 'ZDNet', 'url': 'https://www.zdnet.com/news/rss.xml'},
        {'name': 'GeekWire', 'url': 'https://www.geekwire.com/feed/'},
        {'name': 'MakeUseOf', 'url': 'https://www.makeuseof.com/feed/'},
        {'name': 'MacRumors', 'url': 'https://www.macrumors.com/macrumors.xml'},
        {'name': 'Digitaltrends', 'url': 'https://www.digitaltrends.com/feed/'},
        {'name': 'PC Gamer', 'url': 'https://www.pcgamer.com/rss/'},
        {'name': 'TechRadar', 'url': 'https://www.techradar.com/rss'},
        {'name': 'Gadgets360', 'url': 'https://www.gadgets360.com/rss/news'},
        {'name': 'TechRepublic', 'url': 'https://www.techrepublic.com/rssfeeds/articles/'}
    ],
    'AI': [
        {'name': 'OpenAI', 'url': 'https://openai.com/news/rss.xml'},
        {'name': 'Google AI', 'url': 'https://blog.google/technology/ai/rss/'},
        {'name': 'ML Mastery', 'url': 'https://machinelearningmastery.com/blog/feed/'},
        {'name': 'Data Science', 'url': 'https://towardsdatascience.com/feed'},
        {'name': 'NVIDIA', 'url': 'https://blogs.nvidia.com/feed/'},
        {'name': 'Hugging Face', 'url': 'https://huggingface.co/blog/feed.xml'},
        {'name': 'AWS ML', 'url': 'https://aws.amazon.com/blogs/machine-learning/feed/'},
        {'name': 'TensorFlow', 'url': 'https://blog.tensorflow.org/feeds/posts/default'},
        {'name': 'AI News', 'url': 'https://www.artificialintelligence-news.com/feed/'},
        {'name': 'Synced Review', 'url': 'https://syncedreview.com/feed/'}
    ],
    'Science': [
        {'name': 'Nature', 'url': 'https://www.nature.com/nature.rss'},
        {'name': 'ScienceDaily', 'url': 'https://www.sciencedaily.com/rss/all.xml'},
        {'name': 'Science News', 'url': 'https://www.sciencenews.org/feed'},
        {'name': 'NASA', 'url': 'https://www.nasa.gov/rss/dyn/breaking_news.rss'},
        {'name': 'Phys.org', 'url': 'https://phys.org/rss-feed/'},
        {'name': 'Live Science', 'url': 'https://www.livescience.com/feeds/all'},
        {'name': 'New Scientist', 'url': 'https://www.newscientist.com/feed/home/'},
        {'name': 'Science Mag', 'url': 'https://www.sciencemag.org/rss/news_current.xml'}
    ],
    'Business': [
        {'name': 'MarketWatch', 'url': 'https://www.marketwatch.com/rss/topstories'},
        {'name': 'CNBC', 'url': 'https://www.cnbc.com/id/10001147/device/rss/rss.html'},
        {'name': 'Fortune', 'url': 'https://fortune.com/feed/'},
        {'name': 'Forbes', 'url': 'https://www.forbes.com/business/feed/'},
        {'name': 'Seeking Alpha', 'url': 'https://seekingalpha.com/feed.xml'},
        {'name': 'Moneycontrol BIZ', 'url': 'https://www.moneycontrol.com/rss/business.xml'},
        {'name': 'Bloomberg', 'url': 'https://news.google.com/rss/search?q=when:24h+allinurl:bloomberg.com&hl=en-US&gl=US&ceid=US:en'},
        {'name': 'Entrepreneur', 'url': 'https://www.entrepreneur.com/latest.rss'},
        {'name': 'Investing.com', 'url': 'https://www.investing.com/rss/news_25.rss'},
        {'name': 'Business Standard', 'url': 'https://www.business-standard.com/rss/home_page_top_stories.rss'}
    ],
    'Sports': [
        {'name': 'BBC Sport', 'url': 'http://feeds.bbci.co.uk/sport/rss.xml'},
        {'name': 'Yahoo Sports', 'url': 'https://sports.yahoo.com/rss/'},
        {'name': 'Sky Sports', 'url': 'https://www.skysports.com/rss/12040'},
        {'name': 'CBS Sports', 'url': 'https://www.cbssports.com/rss/headlines'},
        {'name': 'Cricbuzz', 'url': 'https://www.cricbuzz.com/rss-news'},
        {'name': 'ESPN', 'url': 'https://www.espn.com/espn/rss/news'},
        {'name': 'Formula 1', 'url': 'https://www.formula1.com/en/latest/all.xml'},
        {'name': 'Sporting News', 'url': 'https://www.sportingnews.com/us/rss'}
    ],
    'Entertainment': [
        {'name': 'TMZ', 'url': 'https://www.tmz.com/rss.xml'},
        {'name': 'Variety', 'url': 'https://variety.com/feed/'},
        {'name': 'Rolling Stone', 'url': 'https://www.rollingstone.com/feed/'},
        {'name': 'Billboard', 'url': 'https://www.billboard.com/feed/'},
        {'name': 'Hollywood Rep.', 'url': 'https://www.hollywoodreporter.com/feed/'},
        {'name': 'Deadline', 'url': 'https://deadline.com/feed/'},
        {'name': 'E! Online', 'url': 'https://www.eonline.com/syndication/feeds/rssfeeds/topstories.xml'}
    ],
    'Gaming': [
        {'name': 'IGN', 'url': 'https://www.ign.com/rss'},
        {'name': 'GameSpot', 'url': 'https://www.gamespot.com/feeds/mashup/'},
        {'name': 'Polygon', 'url': 'https://www.polygon.com/rss/index.xml'},
        {'name': 'Destructoid', 'url': 'https://www.destructoid.com/feed/'},
        {'name': 'RPS', 'url': 'https://www.rockpapershotgun.com/feed'},
        {'name': 'Kotaku', 'url': 'https://kotaku.com/rss'},
        {'name': 'VG247', 'url': 'https://www.vg247.com/feed/'},
        {'name': 'Eurogamer', 'url': 'https://www.eurogamer.net/feed'},
        {'name': 'Gematsu', 'url': 'https://gematsu.com/feed/'},
        {'name': 'GamesRadar', 'url': 'https://www.gamesradar.com/rss/'},
        {'name': 'VideoGamer', 'url': 'https://www.videogamer.com/feed/'},
        {'name': 'PC Gamer', 'url': 'https://www.pcgamer.com/rss/'},
        {'name': 'PCGamesN', 'url': 'https://www.pcgamesn.com/rss'},
        {'name': 'TechRaptor', 'url': 'https://techraptor.net/feed/'},
        {'name': 'DSOGaming', 'url': 'https://dsogaming.com/feed/'},
        {'name': 'PlayStation Blog', 'url': 'https://blog.playstation.com/feed/'},
        {'name': 'Xbox Wire', 'url': 'https://news.xbox.com/en-us/feed/'},
        {'name': 'Nintendo Life', 'url': 'https://www.nintendolife.com/feeds/latest'}
    ],
    'Programming': [
        {'name': 'StackOverflow', 'url': 'https://stackoverflow.blog/feed/'},
        {'name': 'GitHub', 'url': 'https://github.blog/feed/'},
        {'name': 'Real Python', 'url': 'https://realpython.com/atom.xml'},
        {'name': 'CSS-Tricks', 'url': 'https://css-tricks.com/feed/'},
        {'name': 'Dev.to', 'url': 'https://dev.to/feed'},
        {'name': 'Smashing Mag.', 'url': 'https://www.smashingmagazine.com/feed/'},
        {'name': 'JetBrains', 'url': 'https://blog.jetbrains.com/feed/'},
        {'name': 'freeCodeCamp', 'url': 'https://www.freecodecamp.org/news/rss/'},
        {'name': 'Martin Fowler', 'url': 'https://martinfowler.com/feed.atom'},
        {'name': 'Hacker News', 'url': 'https://hnrss.org/newest'},
        {'name': 'InfoQ', 'url': 'https://www.infoq.com/feed/'},
        {'name': 'The New Stack', 'url': 'https://thenewstack.io/feed/'},
        {'name': 'Planet Python', 'url': 'https://planetpython.org/rss20.xml'},
        {'name': 'JavaScript Weekly', 'url': 'https://javascriptweekly.com/rss/'},
        {'name': 'SitePoint', 'url': 'https://www.sitepoint.com/feed/'},
        {'name': 'StackOverflow Blog', 'url': 'https://blog.stackoverflow.com/feed/'},
        {'name': 'Meta Engineering', 'url': 'https://engineering.fb.com/feed/'},
        {'name': 'Netflix Tech Blog', 'url': 'https://netflixtechblog.com/feed'}
    ],
    'Education': [
        {'name': 'Open Culture', 'url': 'https://www.openculture.com/feed'},
        {'name': 'Edutopia', 'url': 'https://www.edutopia.org/rss.xml'},
        {'name': 'eSchool News', 'url': 'https://www.eschoolnews.com/feed/'},
        {'name': 'Hechinger Report', 'url': 'https://hechingerreport.org/feed/'},
        {'name': 'Education Dive', 'url': 'https://www.educationdive.com/feeds/news/'},
        {'name': 'The 74', 'url': 'https://www.the74million.org/feed/'}
    ]
}

# Add virtual categories
RSS_SOURCES['Trending'] = [
    *RSS_SOURCES['World'][:2],
    *RSS_SOURCES['Tech'][:2],
    *RSS_SOURCES['India'][:1],
    *RSS_SOURCES['AI'][:1]
]

# --- Initialize Firebase ---
if not firebase_admin._apps:
    cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred)

db = firestore.client()

# --- Advanced Scraper Setup ---
session = requests.Session()

def get_best_image_url(html, article_url):
    """
    Implements the '100% Rule' Priority Chain for Images.
    """
    soup = BeautifulSoup(html, 'lxml')
    
    # 1. JSON-LD
    scripts = soup.find_all('script', type='application/ld+json')
    for script in scripts:
        try:
            data = json.loads(script.string)
            def find_img(obj):
                if isinstance(obj, dict):
                    if 'image' in obj:
                        img = obj['image']
                        if isinstance(img, dict) and 'url' in img: return img['url']
                        if isinstance(img, str): return img
                    if 'thumbnailUrl' in obj: return obj['thumbnailUrl']
                    for v in obj.values():
                        res = find_img(v)
                        if res: return res
                elif isinstance(obj, list):
                    for item in obj:
                        res = find_img(item)
                        if res: return res
                return None
            img = find_img(data)
            if img: return img
        except: continue

    # 2. Open Graph
    og_img = soup.find('meta', property='og:image')
    if og_img and og_img.get('content'): return og_img['content']

    # 3. Twitter Card
    tw_img = soup.find('meta', name='twitter:image')
    if tw_img and tw_img.get('content'): return tw_img['content']

    # 4. Body Image (>600px heuristic)
    # Check data-src and srcset fallbacks
    images = soup.find_all('img')
    for img in images:
        src = img.get('src') or img.get('data-src') or img.get('srcset')
        if not src: continue
        width = img.get('width', '0').replace('px', '')
        if width.isdigit() and int(width) > 600:
            return src if not src.startswith('data:') else None

    return None

def extract_fallback_summary(text, count=5):
    if not text: return ""
    clean_text = re.sub(r'<[^>]*>', '', text)
    sentences = re.split(r'(?<=[.!?])\s+|[\r\n]+', clean_text)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 30]
    return " ".join(sentences[:count]).strip()

def normalize_url(url):
    try:
        u = url.lower().strip()
        u = re.sub(r'^(https?://)?(www\.)?', '', u)
        u = u.rstrip('/').split('?')[0]
        return u
    except Exception: return url

def generate_doc_id(url):
    normalized = normalize_url(url)
    b64 = base64.b64encode(normalized.encode()).decode()
    return re.sub(r'[/+=]', '', b64)[:50]

def process_category(category_name, feeds):
    print(f"\n[Sync] Category: {category_name}")
    processed_count = 0
    
    for feed in feeds:
        print(f"  Fetching {feed['name']}...")
        parsed = feedparser.parse(feed['url'])
        
        for entry in parsed.entries[:5]: 
            try:
                url = entry.get('link', '')
                if not url: continue
                
                doc_id = generate_doc_id(url)
                doc_ref = db.collection(COLLECTION_NAME).document(doc_id)
                
                # Deduplication Check
                existing_docs = db.collection(COLLECTION_NAME).where('sourceUrl', '==', url).limit(1).get()
                if len(existing_docs) > 0:
                    continue
                    
                # Secondary Cache check by ID
                existing = doc_ref.get()
                if existing.exists:
                    continue

                # --- High Accuracy Download ---
                headers = {
                    'User-Agent': GOOGLEBOT_UA,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Referer': 'https://www.google.com/'
                }
                
                response = session.get(url, headers=headers, timeout=15)
                # Don't fail on transient errors, just skip
                if response.status_code != 200: continue
                html = response.text

                # --- Image Extraction Chain ---
                image_url = get_best_image_url(html, url)
                
                # --- Text Extraction Hybrid ---
                # 1. Newspaper4k
                article = Article(url)
                article.html = html
                article.parse()
                title = article.title or entry.get('title', 'Untitled')
                text = article.text
                author = article.authors[0] if article.authors else ""
                
                # 2. Trafilatura Fallback (<200 words)
                if len(text.split()) < 200:
                    trafilatura_text = trafilatura.extract(html)
                    if trafilatura_text and len(trafilatura_text.split()) > len(text.split()):
                        text = trafilatura_text

                # Exit if text is still too short (likely a dynamic obstacle)
                if len(text) < 300: continue
                
                # Use Newspaper4k for top image if our BeautifulSoup chain failed
                if not image_url:
                    image_url = article.top_img

                # Validation
                if not image_url or "placeholder" in image_url.lower(): continue

                # Summary (Professional Local Summary)
                summary = extract_fallback_summary(text, 5)

                # Push to Firestore
                doc_ref.set({
                    'title': title,
                    'summary': summary,
                    'imageUrl': image_url,
                    'category': category_name.upper(),
                    'sourceUrl': url,
                    'source': feed['name'],
                    'author': author,
                    'publishDate': str(article.publish_date) if article.publish_date else "",
                    'timestamp': datetime.now(),
                    'createdAt': datetime.now(),
                    'fullText': text, # Storing full text as requested
                    'content': text # Sync with existing field
                })
                
                # Use a safe print for Windows terminals
                safe_title = title.encode('ascii', 'ignore').decode('ascii')
                print(f"    Pushed: {safe_title[:40]}...")
                processed_count += 1
                
                # Respectful delay
                time.sleep(random.uniform(0.5, 1.5))
                
            except Exception as e:
                # Debugging print for major errors only
                if "403" not in str(e): 
                    safe_error = str(e).encode('ascii', 'ignore').decode('ascii')
                    print(f"    Error on {url[:30]}: {safe_error}")
                continue
                
    return processed_count

def main():
    print(f"[100% Accuracy Scraper] Starting sync at {datetime.now().isoformat()}")
    
    # 1. 5-Minute Rotation Logic
    # Exclude Trending as it's a virtual combination
    categories = [c for c in RSS_SOURCES.keys() if c != 'Trending']
    current_epoch_5min = int(time.time() // (5 * 60))
    target_category = categories[current_epoch_5min % len(categories)]
    
    feeds = RSS_SOURCES[target_category]
    
    print(f"[Rotation] Target Category: {target_category} (Index: {current_epoch_5min % len(categories)}/{len(categories)})")
    
    total_processed = process_category(target_category, feeds)
    
    # 2. Trigger Real-time Cache Invalidation for Expo Go Clients
    if total_processed > 0:
        db.collection('_metadata').document('sync_status').set({
            'last_category': target_category.upper(),
            'last_sync': firestore.SERVER_TIMESTAMP
        }, merge=True)
        print(f"[Sync] Updated _metadata/sync_status. Expo Go clients on '{target_category}' will now auto-refresh.")
        
    print(f"\n[Sync Complete] Total articles pushed in this tick: {total_processed}")

if __name__ == "__main__":
    main()
