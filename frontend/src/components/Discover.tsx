import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchDiscover, resolveDiscover } from "../api";
import type { Folder } from "../api/types";
import { BaseModal } from "../modals/BaseModal";
import { useLog } from "../hooks/useLog";
import { extractErrorMessage } from "../services/LogService";
import { Button, Input, Select, Label, FormGroup } from "./ui";

type Props = {
  folders: Folder[];
  onAddFeed: (folderId: number, url: string) => Promise<void>;
  onCreateFolder: (name: string) => Promise<Folder>;
};

type FeedRef = { title: string; url: string };
type CategoryCard = { title: string; image: string; feeds: FeedRef[] };

const FALLBACK_CATEGORY_IMAGE =
  "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=900&q=80";

const BASE_CATEGORIES: CategoryCard[] = [
  // =====================================================
  // TECHNOLOGY & DEVELOPMENT
  // =====================================================
  {
    title: "Technology & Development",
    image: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=900&q=80",
    feeds: [
      // General Tech
      { title: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
      { title: "Ars Technica", url: "http://feeds.arstechnica.com/arstechnica/index" },
      { title: "Wired", url: "https://www.wired.com/feed/rss" },
      { title: "TechCrunch", url: "http://feeds.feedburner.com/TechCrunch" },
      { title: "The Next Web", url: "https://thenextweb.com/feed/" },
      { title: "Engadget", url: "https://www.engadget.com/rss.xml" },
      { title: "MIT Technology Review", url: "https://www.technologyreview.com/feed/" },
      { title: "Hacker News", url: "https://hnrss.org/frontpage" },
      { title: "GitHub Blog", url: "https://github.blog/feed/" },
      { title: "Product Hunt", url: "https://www.producthunt.com/feed" },
      { title: "Slashdot", url: "http://rss.slashdot.org/Slashdot/slashdotMain" },
      { title: "VentureBeat", url: "https://feeds.feedburner.com/venturebeat/SZYF" },
      // Programming
      { title: "Coding Horror", url: "https://feeds.feedburner.com/codinghorror" },
      { title: "Dan Abramov (Overreacted)", url: "https://overreacted.io/rss.xml" },
      { title: "InfoQ", url: "https://feed.infoq.com" },
      { title: "Martin Fowler", url: "https://martinfowler.com/feed.atom" },
      { title: "Joel on Software", url: "https://www.joelonsoftware.com/feed/" },
      { title: "Stack Overflow Blog", url: "https://stackoverflow.blog/feed/" },
      { title: "Netflix Tech Blog", url: "https://netflixtechblog.com/feed" },
      { title: "Spotify Engineering", url: "https://labs.spotify.com/feed/" },
      { title: "Airbnb Engineering", url: "https://medium.com/feed/airbnb-engineering" },
      // Web Development
      { title: "CSS-Tricks", url: "https://css-tricks.com/feed/" },
      { title: "Smashing Magazine", url: "https://www.smashingmagazine.com/feed" },
      { title: "DEV Community", url: "https://dev.to/feed" },
      { title: "web.dev", url: "https://web.dev/feed.xml" },
      { title: "Mozilla Hacks", url: "https://hacks.mozilla.org/feed/" },
      { title: "freeCodeCamp", url: "https://www.freecodecamp.org/news/rss/" },
      // UX/UI
      { title: "UX Collective", url: "https://uxdesign.cc/feed" },
      { title: "NN/g Articles", url: "https://www.nngroup.com/feed/rss/" },
    ],
  },
  {
    title: "Android",
    image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=900&q=80",
    feeds: [
      { title: "Android Authority", url: "https://www.androidauthority.com/feed" },
      { title: "Android Central", url: "http://feeds.androidcentral.com/androidcentral" },
      { title: "Android Police", url: "http://feeds.feedburner.com/AndroidPolice" },
      { title: "Droid Life", url: "https://www.droid-life.com/feed" },
      { title: "XDA Developers", url: "https://data.xda-developers.com/portal-feed" },
      { title: "Android Developers Blog", url: "http://feeds.feedburner.com/blogspot/hsDu" },
      { title: "Android Developers (Medium)", url: "https://medium.com/feed/androiddevelopers" },
      { title: "ProAndroidDev", url: "https://proandroiddev.com/feed" },
      { title: "Jake Wharton", url: "https://jakewharton.com/atom.xml" },
      { title: "Kt. Academy", url: "https://blog.kotlin-academy.com/feed" },
      { title: "r/Android", url: "https://www.reddit.com/r/android/.rss" },
      { title: "r/androiddev", url: "https://reddit.com/r/androiddev.rss" },
    ],
  },
  {
    title: "Apple & iOS",
    image: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=900&q=80",
    feeds: [
      { title: "9to5Mac", url: "https://9to5mac.com/feed" },
      { title: "Apple Newsroom", url: "https://www.apple.com/newsroom/rss-feed.rss" },
      { title: "MacRumors", url: "http://feeds.macrumors.com/MacRumors-Mac" },
      { title: "MacStories", url: "https://www.macstories.net/feed" },
      { title: "Daring Fireball", url: "https://daringfireball.net/feeds/main" },
      { title: "iMore", url: "http://feeds.feedburner.com/TheiPhoneBlog" },
      { title: "Apple Developer News", url: "https://developer.apple.com/news/rss/news.rss" },
      { title: "Swift by Sundell", url: "https://www.swiftbysundell.com/feed.rss" },
      { title: "Use Your Loaf", url: "https://useyourloaf.com/blog/rss.xml" },
      { title: "r/Apple", url: "https://www.reddit.com/r/apple/.rss" },
      { title: "r/iPhone", url: "https://www.reddit.com/r/iphone/.rss" },
    ],
  },
  {
    title: "AI & Machine Learning",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=900&q=80",
    feeds: [
      { title: "OpenAI Blog", url: "https://blog.openai.com/rss/" },
      { title: "DeepMind Blog", url: "https://deepmind.com/blog/feed/basic/" },
      { title: "Google Research Blog", url: "https://googleresearch.blogspot.com/atom.xml" },
      { title: "MIT News - AI", url: "https://news.mit.edu/rss/topic/artificial-intelligence2" },
      { title: "The Gradient", url: "https://thegradient.pub/rss/" },
      { title: "Hugging Face Blog", url: "https://huggingface.co/blog/feed.xml" },
      { title: "Anthropic Research", url: "https://www.anthropic.com/index/rss.xml" },
      { title: "r/MachineLearning", url: "https://www.reddit.com/r/MachineLearning/.rss" },
    ],
  },
  {
    title: "Linux & DevOps",
    image: "https://images.unsplash.com/photo-1640552435388-a54879e72b28?w=900&q=80",
    feeds: [
      { title: "OMG! Ubuntu!", url: "https://www.omgubuntu.co.uk/feed" },
      { title: "It's FOSS", url: "https://itsfoss.com/feed/" },
      { title: "Linux Handbook", url: "https://linuxhandbook.com/rss/" },
      { title: "Kubernetes Blog", url: "https://kubernetes.io/feed.xml" },
      { title: "Docker Blog", url: "https://www.docker.com/blog/feed/" },
      { title: "Tecmint", url: "https://www.tecmint.com/feed/" },
    ],
  },
  {
    title: "Cyber Security",
    image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=900&q=80",
    feeds: [
      { title: "The Hacker News", url: "https://feeds.feedburner.com/TheHackersNews" },
      { title: "BleepingComputer", url: "https://www.bleepingcomputer.com/feed/" },
      { title: "Krebs on Security", url: "https://krebsonsecurity.com/feed/" },
      { title: "Sophos Naked Security", url: "https://nakedsecurity.sophos.com/feed" },
      { title: "Dark Reading", url: "https://www.darkreading.com/rss.xml" },
    ],
  },
  // =====================================================
  // BUSINESS & FINANCE
  // =====================================================
  {
    title: "Business & Finance",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=900&q=80",
    feeds: [
      { title: "Forbes Business", url: "https://www.forbes.com/business/feed/" },
      { title: "Fortune", url: "https://fortune.com/feed" },
      { title: "CNBC Top News", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html" },
      { title: "Entrepreneur", url: "http://feeds.feedburner.com/entrepreneur/latest" },
      { title: "Inc.com", url: "https://www.inc.com/rss/" },
      { title: "Y Combinator Blog", url: "https://www.ycombinator.com/blog/rss/" },
      { title: "Stratechery", url: "http://stratechery.com/feed/" },
      { title: "Paul Graham Essays", url: "http://www.aaronsw.com/2002/feeds/pgessays.rss" },
      { title: "Tim Ferriss Blog", url: "https://tim.blog/feed/" },
      { title: "NerdWallet", url: "https://www.nerdwallet.com/blog/feed/" },
      { title: "r/personalfinance", url: "https://reddit.com/r/personalfinance/.rss" },
    ],
  },
  // =====================================================
  // NEWS
  // =====================================================
  {
    title: "World News",
    image: "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=900&q=80",
    feeds: [
      { title: "BBC News - World", url: "http://feeds.bbci.co.uk/news/world/rss.xml" },
      { title: "CNN World", url: "http://rss.cnn.com/rss/edition_world.rss" },
      { title: "NYT World", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml" },
      { title: "Google News", url: "https://news.google.com/rss" },
      { title: "The Guardian World", url: "https://www.theguardian.com/world/rss" },
      { title: "Washington Post", url: "http://feeds.washingtonpost.com/rss/world" },
      { title: "WSJ World", url: "https://feeds.a.dj.com/rss/RSSWorldNews.xml" },
      { title: "Axios", url: "https://api.axios.com/feed/" },
      { title: "Politico Playbook", url: "https://rss.politico.com/playbook.xml" },
      { title: "r/worldnews", url: "https://www.reddit.com/r/worldnews/.rss" },
    ],
  },
  {
    title: "Regional News - Asia Pacific",
    image: "https://images.unsplash.com/photo-1532664189809-02133fee698d?w=900&q=80",
    feeds: [
      // India
      { title: "BBC News India", url: "http://feeds.bbci.co.uk/news/world/asia/india/rss.xml" },
      { title: "Times of India", url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms" },
      { title: "The Hindu", url: "https://www.thehindu.com/feeder/default.rss" },
      { title: "NDTV Top Stories", url: "https://feeds.feedburner.com/ndtvnews-top-stories" },
      { title: "India Today", url: "https://www.indiatoday.in/rss/home" },
      { title: "Scroll.in", url: "http://feeds.feedburner.com/ScrollinArticles.rss" },
      // Australia (working feeds only)
      { title: "ABC News Australia", url: "https://www.abc.net.au/news/feed/1948/rss.xml" },
      { title: "Sydney Morning Herald", url: "https://www.smh.com.au/rss/feed.xml" },
      { title: "The Age", url: "https://www.theage.com.au/rss/feed.xml" },
      // Japan
      { title: "Japan Times", url: "https://www.japantimes.co.jp/feed/topstories/" },
      { title: "Japan Today", url: "https://japantoday.com/feed" },
    ],
  },
  {
    title: "Regional News - Europe",
    image: "https://images.unsplash.com/photo-1554072675-66db59dba46f?w=900&q=80",
    feeds: [
      // UK
      { title: "BBC News Home", url: "http://feeds.bbci.co.uk/news/rss.xml" },
      { title: "The Guardian UK", url: "https://www.theguardian.com/world/rss" },
      { title: "The Independent UK", url: "http://www.independent.co.uk/news/uk/rss" },
      // Germany
      { title: "Deutsche Welle", url: "https://rss.dw.com/rdf/rss-en-all" },
      { title: "Tagesschau", url: "http://www.tagesschau.de/xml/rss2" },
      // France
      { title: "France24", url: "https://www.france24.com/en/rss" },
      { title: "Le Monde", url: "https://www.lemonde.fr/rss/une.xml" },
      // Italy
      { title: "ANSA", url: "https://www.ansa.it/sito/ansait_rss.xml" },
      { title: "Repubblica", url: "https://www.repubblica.it/rss/homepage/rss2.0.xml" },
      // Spain
      { title: "El País", url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada" },
    ],
  },
  {
    title: "Regional News - Americas",
    image: "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=900&q=80",
    feeds: [
      // Canada
      { title: "CBC Top Stories", url: "https://www.cbc.ca/cmlink/rss-topstories" },
      { title: "CTV News", url: "https://www.ctvnews.ca/rss/ctvnews-ca-top-stories-public-rss-1.822009" },
      { title: "Global News Canada", url: "https://globalnews.ca/feed/" },
      // Mexico
      { title: "Mexico News Daily", url: "https://mexiconewsdaily.com/feed/" },
      // Brazil
      { title: "The Rio Times", url: "https://riotimesonline.com/feed/" },
    ],
  },
  // =====================================================
  // SCIENCE & SPACE
  // =====================================================
  {
    title: "Science & Space",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=900&q=80",
    feeds: [
      { title: "ScienceDaily", url: "https://www.sciencedaily.com/rss/all.xml" },
      { title: "NYT Science", url: "https://rss.nytimes.com/services/xml/rss/nyt/Science.xml" },
      { title: "Nature", url: "https://www.nature.com/nature.rss" },
      { title: "Scientific American", url: "http://rss.sciam.com/ScientificAmerican-Global" },
      { title: "Phys.org", url: "https://phys.org/rss-feed/" },
      { title: "NASA Breaking News", url: "https://www.nasa.gov/rss/dyn/breaking_news.rss" },
      { title: "Space.com", url: "https://www.space.com/feeds/all" },
      { title: "TED Talks Daily", url: "https://pa.tedcdn.com/feeds/talks.rss" },
      { title: "r/science", url: "https://reddit.com/r/science/.rss" },
      { title: "r/space", url: "https://www.reddit.com/r/space/.rss?format=xml" },
    ],
  },
  // =====================================================
  // SPORTS
  // =====================================================
  {
    title: "Sports",
    image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=900&q=80",
    feeds: [
      { title: "BBC Sport", url: "http://feeds.bbci.co.uk/sport/rss.xml" },
      { title: "ESPN Top", url: "https://www.espn.com/espn/rss/news" },
      { title: "Yahoo Sports", url: "https://sports.yahoo.com/rss/" },
      // Football/Soccer
      { title: "Goal.com", url: "https://www.goal.com/feeds/en/news" },
      { title: "Football365", url: "https://www.football365.com/feed" },
      // Cricket
      { title: "ESPN Cricinfo", url: "http://www.espncricinfo.com/rss/content/story/feeds/0.xml" },
      { title: "Wisden", url: "https://www.wisden.com/feed" },
      // Tennis
      { title: "BBC Tennis", url: "http://feeds.bbci.co.uk/sport/tennis/rss.xml" },
      { title: "ESPN Tennis", url: "https://www.espn.com/espn/rss/tennis/news" },
      // F1
      { title: "r/formula1", url: "https://www.reddit.com/r/formula1/.rss" },
      { title: "r/sports", url: "https://www.reddit.com/r/sports.rss" },
    ],
  },
  // =====================================================
  // ENTERTAINMENT
  // =====================================================
  {
    title: "Entertainment",
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=900&q=80",
    feeds: [
      // Movies
      { title: "/Film", url: "https://feeds2.feedburner.com/slashfilm" },
      { title: "Deadline", url: "https://deadline.com/feed/" },
      { title: "IndieWire", url: "https://www.indiewire.com/feed" },
      { title: "Variety", url: "https://variety.com/feed/" },
      { title: "r/movies", url: "https://reddit.com/r/movies/.rss" },
      // TV
      { title: "TVLine", url: "https://tvline.com/feed/" },
      { title: "r/television", url: "https://reddit.com/r/television/.rss" },
      // Music
      { title: "Billboard", url: "https://www.billboard.com/articles/rss.xml" },
      { title: "Pitchfork News", url: "http://pitchfork.com/rss/news" },
      { title: "Consequence", url: "http://consequenceofsound.net/feed" },
    ],
  },
  {
    title: "Gaming",
    image: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=900&q=80",
    feeds: [
      { title: "IGN All", url: "http://feeds.ign.com/ign/all" },
      { title: "Kotaku", url: "https://kotaku.com/rss" },
      { title: "Polygon", url: "https://www.polygon.com/rss/index.xml" },
      { title: "GameSpot", url: "https://www.gamespot.com/feeds/mashup/" },
      { title: "Eurogamer", url: "https://www.eurogamer.net/?format=rss" },
      { title: "Rock Paper Shotgun", url: "http://feeds.feedburner.com/RockPaperShotgun" },
      { title: "PlayStation Blog", url: "http://feeds.feedburner.com/psblog" },
      { title: "Steam News", url: "https://store.steampowered.com/feeds/news.xml" },
      { title: "r/gaming", url: "https://www.reddit.com/r/gaming.rss" },
    ],
  },
  {
    title: "Fun & Comics",
    image: "https://images.unsplash.com/photo-1588497859490-85d1c17db96d?w=900&q=80",
    feeds: [
      { title: "xkcd", url: "https://xkcd.com/rss.xml" },
      { title: "SMBC Comics", url: "https://www.smbc-comics.com/comic/rss" },
      { title: "The Oatmeal", url: "http://feeds.feedburner.com/oatmealfeed" },
      { title: "Explosm (C&H)", url: "http://feeds.feedburner.com/Explosm" },
      { title: "Penny Arcade", url: "https://www.penny-arcade.com/feed" },
      { title: "The Onion", url: "https://www.theonion.com/rss" },
      { title: "The Daily WTF", url: "http://syndication.thedailywtf.com/TheDailyWtf" },
    ],
  },
  // =====================================================
  // LIFESTYLE
  // =====================================================
  {
    title: "Lifestyle",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&q=80",
    feeds: [
      // Food
      { title: "Serious Eats", url: "http://feeds.feedburner.com/seriouseats/recipes" },
      { title: "Smitten Kitchen", url: "http://feeds.feedburner.com/smittenkitchen" },
      { title: "Skinnytaste", url: "https://www.skinnytaste.com/feed/" },
      { title: "NYT Dining & Wine", url: "https://rss.nytimes.com/services/xml/rss/nyt/DiningandWine.xml" },
      // Travel
      { title: "Atlas Obscura", url: "https://www.atlasobscura.com/feeds/latest" },
      { title: "Lonely Planet News", url: "https://www.lonelyplanet.com/news/feed/atom/" },
      { title: "Nomadic Matt", url: "https://www.nomadicmatt.com/travel-blog/feed/" },
      { title: "NYT Travel", url: "https://rss.nytimes.com/services/xml/rss/nyt/Travel.xml" },
    ],
  },
  {
    title: "Culture",
    image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=900&q=80",
    feeds: [
      // Photography
      { title: "PetaPixel", url: "https://petapixel.com/feed/" },
      { title: "Digital Photography School", url: "https://feeds.feedburner.com/DigitalPhotographySchool" },
      // Books
      { title: "Book Riot", url: "https://bookriot.com/feed/" },
      { title: "r/books", url: "https://reddit.com/r/books/.rss" },
      // History
      { title: "HistoryNet", url: "http://www.historynet.com/feed" },
      { title: "Throughline (NPR)", url: "https://feeds.npr.org/510333/podcast.xml" },
    ],
  },
  {
    title: "Fashion & Beauty",
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=900&q=80",
    feeds: [
      { title: "Fashionista", url: "https://fashionista.com/.rss/excerpt/" },
      { title: "NYT Fashion & Style", url: "https://rss.nytimes.com/services/xml/rss/nyt/FashionandStyle.xml" },
      { title: "Who What Wear", url: "https://www.whowhatwear.com/rss" },
      { title: "The Guardian Fashion", url: "https://www.theguardian.com/fashion/rss" },
      { title: "Into The Gloss", url: "https://feeds.feedburner.com/intothegloss/oqoU" },
      { title: "The Beauty Look Book", url: "https://thebeautylookbook.com/feed" },
    ],
  },
  {
    title: "Design & Home",
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=900&q=80",
    feeds: [
      // Architecture
      { title: "ArchDaily", url: "http://feeds.feedburner.com/Archdaily" },
      { title: "Dezeen", url: "https://www.dezeen.com/feed/" },
      { title: "Architectural Digest", url: "https://www.architecturaldigest.com/feed/rss" },
      // Interior
      { title: "Apartment Therapy", url: "https://www.apartmenttherapy.com/design.rss" },
      { title: "Design Milk", url: "https://design-milk.com/feed/" },
      { title: "The Design Files", url: "https://thedesignfiles.net/feed/" },
      // DIY
      { title: "Hackaday", url: "https://hackaday.com/blog/feed/" },
      { title: "How-To Geek", url: "https://www.howtogeek.com/feed/" },
      { title: "MakeUseOf", url: "https://www.makeuseof.com/feed/" },
    ],
  },
  {
    title: "Automotive",
    image: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=900&q=80",
    feeds: [
      { title: "Autoblog", url: "https://www.autoblog.com/rss.xml" },
      { title: "Jalopnik", url: "https://jalopnik.com/rss" },
      { title: "Car and Driver", url: "https://www.caranddriver.com/rss/all.xml/" },
      { title: "Carscoops", url: "https://www.carscoops.com/feed/" },
      { title: "Bring a Trailer", url: "https://bringatrailer.com/feed/" },
      { title: "The Truth About Cars", url: "https://www.thetruthaboutcars.com/feed/" },
    ],
  },
  {
    title: "Health & Biotech",
    image: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=900&q=80",
    feeds: [
      { title: "STAT News", url: "https://www.statnews.com/feed/" },
      { title: "KFF Health News", url: "https://kffhealthnews.org/feed/" },
      { title: "The Health Care Blog", url: "https://thehealthcareblog.com/blog/feed/" },
      { title: "Nature Biotech", url: "https://www.nature.com/subjects/biotech.rss" },
      { title: "Fierce Biotech", url: "https://www.fiercebiotech.com/rss" },
    ],
  },
  {
    title: "Energy & Environment",
    image: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=900&q=80",
    feeds: [
      { title: "CleanTechnica", url: "https://cleantechnica.com/feed/" },
      { title: "Energy.gov", url: "https://www.energy.gov/rss.xml" },
      { title: "BBC Science", url: "http://feeds.bbci.co.uk/news/science_and_environment/rss.xml" },
    ],
  },
  // =====================================================
  // REDDIT COMMUNITIES
  // =====================================================
  {
    title: "Reddit",
    image: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=900&q=80",
    feeds: [
      { title: "r/programming", url: "https://www.reddit.com/r/programming/.rss" },
      { title: "r/technology", url: "https://www.reddit.com/r/technology/.rss" },
      { title: "r/machinelearning", url: "https://www.reddit.com/r/MachineLearning/.rss" },
      { title: "r/webdev", url: "https://www.reddit.com/r/webdev/.rss" },
      { title: "r/javascript", url: "https://www.reddit.com/r/javascript/.rss" },
      { title: "r/golang", url: "https://www.reddit.com/r/golang/.rss" },
      { title: "r/rust", url: "https://www.reddit.com/r/rust/.rss" },
      { title: "r/python", url: "https://www.reddit.com/r/Python/.rss" },
      { title: "r/worldnews", url: "https://www.reddit.com/r/worldnews/.rss" },
      { title: "r/science", url: "https://www.reddit.com/r/science/.rss" },
      { title: "r/android", url: "https://www.reddit.com/r/android/.rss" },
      { title: "r/apple", url: "https://www.reddit.com/r/apple/.rss" },
      { title: "r/gaming", url: "https://www.reddit.com/r/gaming.rss" },
      { title: "r/movies", url: "https://reddit.com/r/movies/.rss" },
      { title: "r/books", url: "https://reddit.com/r/books/.rss" },
      { title: "r/personalfinance", url: "https://reddit.com/r/personalfinance/.rss" },
    ],
  },
];

export function Discover({ folders, onAddFeed, onCreateFolder }: Props) {
  const { success, info, error: logError } = useLog();

  useQuery({
    queryKey: ["discover"],
    queryFn: fetchDiscover,
  });

  const [activeTab, setActiveTab] = useState<"websites" | "reddit" | "newsletters" | "google">("websites");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryCard | null>(null);
  const [addingFeed, setAddingFeed] = useState<FeedRef | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<number | "">(
    folders.length > 0 ? folders[0].id : ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // URL input state for manual addition
  const [manualUrl, setManualUrl] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedFeeds, setResolvedFeeds] = useState<{ title: string; url: string }[]>([]);

  // Update selected folder when folders change
  useEffect(() => {
    if (folders.length > 0 && selectedFolderId === "") {
      setSelectedFolderId(folders[0].id);
    }
  }, [folders, selectedFolderId]);

  const categories = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();
    if (!normalizedSearch) return BASE_CATEGORIES;
    return BASE_CATEGORIES.map((cat) => ({
      ...cat,
      feeds: cat.feeds.filter(
        (f) =>
          f.title.toLowerCase().includes(normalizedSearch) ||
          f.url.toLowerCase().includes(normalizedSearch)
      ),
    })).filter((cat) => cat.feeds.length > 0);
  }, [search]);

  const websiteCategories = useMemo(
    () => categories.filter((c) => c.title !== "Reddit"),
    [categories]
  );
  const redditCategory = useMemo(
    () => categories.find((c) => c.title === "Reddit"),
    [categories]
  );

  const handleAddFeed = async () => {
    if (!addingFeed || !selectedFolderId) return;
    setIsSubmitting(true);
    try {
      await onAddFeed(Number(selectedFolderId), addingFeed.url);
      success("feed", "Feed added", `${addingFeed.title} has been added to your folder`);
      setAddingFeed(null);
    } catch (err) {
      logError("feed", "Failed to add feed", extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setIsSubmitting(true);
    try {
      const folder = await onCreateFolder(newFolderName.trim());
      setSelectedFolderId(folder.id);
      setShowNewFolder(false);
      setNewFolderName("");
      success("folder", "Folder created", `${folder.name} is ready to use`);
    } catch (err) {
      logError("folder", "Failed to create folder", extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveUrl = async () => {
    if (!manualUrl.trim()) return;
    setIsResolving(true);
    setResolvedFeeds([]);
    try {
      const result = await resolveDiscover(manualUrl.trim());
      if (result.feeds && result.feeds.length > 0) {
        setResolvedFeeds(result.feeds);
        info("feed", "Feeds found", `Found ${result.feeds.length} feed(s)`);
      } else {
        logError("feed", "No feeds found", "Could not find any RSS feeds at this URL");
      }
    } catch (err) {
      logError("feed", "Failed to resolve URL", extractErrorMessage(err));
    } finally {
      setIsResolving(false);
    }
  };

  const handleAddResolvedFeed = async (feed: { title: string; url: string }) => {
    if (!selectedFolderId) return;
    setIsSubmitting(true);
    try {
      await onAddFeed(Number(selectedFolderId), feed.url);
      success("feed", "Feed added", `${feed.title || "Feed"} has been added`);
      setResolvedFeeds((prev) => prev.filter((f) => f.url !== feed.url));
      if (resolvedFeeds.length === 1) {
        setManualUrl("");
      }
    } catch (err) {
      logError("feed", "Failed to add feed", extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="discover-page space-y-8 pb-12">
      {/* Hero Section */}
      <section className="discover-hero relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-8 text-white shadow-2xl md:p-12">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            Discover Great Feeds
          </h1>
          <p className="mt-3 max-w-xl text-lg text-white/90">
            Explore curated RSS feeds from top publishers or add your own sources
          </p>
        </div>
      </section>

      {/* Add by URL Section */}
      <section className="discover-add-url space-y-4">
        <h2 className="text-lg font-semibold">Add by URL</h2>
        <div className="flex gap-3">
          <Input
            placeholder="Enter website or RSS feed URL..."
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleResolveUrl()}
            className="flex-1"
          />
          <Button onClick={handleResolveUrl} disabled={isResolving || !manualUrl.trim()}>
            {isResolving ? "Finding..." : "Find Feeds"}
          </Button>
        </div>
        {resolvedFeeds.length > 0 && (
          <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Found {resolvedFeeds.length} feed(s):
            </p>
            {resolvedFeeds.map((feed, idx) => (
              <div key={idx} className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{feed.title || "Untitled Feed"}</p>
                  <p className="text-xs text-gray-500 truncate">{feed.url}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAddResolvedFeed(feed)}
                  disabled={isSubmitting || !selectedFolderId}
                >
                  Add
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Search */}
      <section className="discover-search">
        <Input
          placeholder="Search feeds..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </section>

      {/* Tabs */}
      <section className="discover-tabs">
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          {(["websites", "reddit"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab
                ? "border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
            >
              {tab === "websites" ? "Websites" : "Reddit"}
            </button>
          ))}
        </div>
      </section>

      {/* Category Grid */}
      {activeTab === "websites" && (
        <section className="discover-categories">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {websiteCategories.map((cat) => (
              <button
                key={cat.title}
                onClick={() => setSelectedCategory(cat)}
                className="group relative overflow-hidden rounded-2xl bg-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-gray-900"
              >
                <div className="aspect-[16/9] overflow-hidden">
                  <img
                    src={cat.image || FALLBACK_CATEGORY_IMAGE}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-lg font-bold text-white">{cat.title}</h3>
                  <p className="text-sm text-white/80">{cat.feeds.length} feeds</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {activeTab === "reddit" && redditCategory && (
        <section className="discover-reddit">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {redditCategory.feeds.map((feed) => (
              <div
                key={feed.url}
                className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{feed.title}</p>
                </div>
                <Button size="sm" onClick={() => setAddingFeed(feed)}>
                  Add
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Category Detail Modal */}
      <BaseModal
        open={!!selectedCategory}
        onClose={() => setSelectedCategory(null)}
        title={selectedCategory?.title || ""}
        maxWidthClass="max-w-3xl"
      >
        {selectedCategory && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {selectedCategory.feeds.length} feeds available
            </p>
            <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-2">
              {selectedCategory.feeds.map((feed) => (
                <div
                  key={feed.url}
                  className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{feed.title}</p>
                    <p className="text-xs text-gray-500 truncate">{feed.url}</p>
                  </div>
                  <Button size="sm" onClick={() => setAddingFeed(feed)}>
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </BaseModal>

      {/* Add Feed Modal */}
      <BaseModal
        open={!!addingFeed}
        onClose={() => setAddingFeed(null)}
        title="Add Feed"
        maxWidthClass="max-w-md"
      >
        {addingFeed && (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <p className="font-medium">{addingFeed.title}</p>
              <p className="text-xs text-gray-500 truncate">{addingFeed.url}</p>
            </div>

            <FormGroup>
              <Label>Add to folder</Label>
              {showNewFolder ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    autoFocus
                  />
                  <Button onClick={handleCreateFolder} disabled={isSubmitting || !newFolderName.trim()}>
                    Create
                  </Button>
                  <Button variant="ghost" onClick={() => setShowNewFolder(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(Number(e.target.value) || "")}
                    className="flex-1"
                  >
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </Select>
                  <Button variant="outline" onClick={() => setShowNewFolder(true)}>
                    New
                  </Button>
                </div>
              )}
            </FormGroup>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setAddingFeed(null)}>
                Cancel
              </Button>
              <Button onClick={handleAddFeed} disabled={isSubmitting || !selectedFolderId}>
                {isSubmitting ? "Adding..." : "Add Feed"}
              </Button>
            </div>
          </div>
        )}
      </BaseModal>
    </div>
  );
}
