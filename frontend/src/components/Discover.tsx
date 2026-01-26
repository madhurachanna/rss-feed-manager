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
  // TECHNOLOGY & SOFTWARE
  // =====================================================
  {
    title: "Technology",
    image: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=900&q=80",
    feeds: [
      { title: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
      { title: "Ars Technica", url: "http://feeds.arstechnica.com/arstechnica/index" },
      { title: "Wired", url: "https://www.wired.com/feed/rss" },
      { title: "TechCrunch", url: "http://feeds.feedburner.com/TechCrunch" },
      { title: "The Next Web", url: "https://thenextweb.com/feed/" },
      { title: "Engadget", url: "https://www.engadget.com/rss.xml" },
      { title: "MIT Technology Review", url: "https://www.technologyreview.com/feed/" },
      { title: "IEEE Spectrum", url: "https://spectrum.ieee.org/rss/fulltext" },
      { title: "Hacker News", url: "https://hnrss.org/frontpage" },
      { title: "GitHub Blog", url: "https://github.blog/feed/" },
      { title: "Product Hunt", url: "https://www.producthunt.com/feed" },
      { title: "Gizmodo", url: "https://gizmodo.com/rss" },
      { title: "Lifehacker", url: "https://lifehacker.com/rss" },
      { title: "Mashable", url: "http://feeds.mashable.com/Mashable" },
      { title: "ReadWrite", url: "https://readwrite.com/feed/" },
      { title: "Slashdot", url: "http://rss.slashdot.org/Slashdot/slashdotMain" },
      { title: "The Keyword (Google)", url: "https://www.blog.google/rss/" },
      { title: "CNET News", url: "https://www.cnet.com/rss/news/" },
      { title: "VentureBeat", url: "https://feeds.feedburner.com/venturebeat/SZYF" },
    ],
  },
  {
    title: "Programming",
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=900&q=80",
    feeds: [
      { title: "Better Programming", url: "https://medium.com/feed/better-programming" },
      { title: "Code as Craft (Etsy)", url: "https://codeascraft.com/feed/atom/" },
      { title: "CodeNewbie Podcast", url: "http://feeds.codenewbie.org/cnpodcast.xml" },
      { title: "Coding Horror", url: "https://feeds.feedburner.com/codinghorror" },
      { title: "Complete Developer Podcast", url: "https://completedeveloperpodcast.com/feed/podcast/" },
      { title: "Dan Abramov (Overreacted)", url: "https://overreacted.io/rss.xml" },
      { title: "Developer Tea", url: "https://feeds.simplecast.com/dLRotFGk" },
      { title: "Twitter Engineering", url: "https://blog.twitter.com/engineering/en_us/blog.rss" },
      { title: "FLOSS Weekly", url: "https://feeds.twit.tv/floss.xml" },
      { title: "Facebook Engineering", url: "https://engineering.fb.com/feed/" },
      { title: "GitLab Blog", url: "https://about.gitlab.com/atom.xml" },
      { title: "Google Developers Blog", url: "http://feeds.feedburner.com/GDBcode" },
      { title: "HackerNoon", url: "https://medium.com/feed/hackernoon" },
      { title: "Hanselminutes", url: "https://feeds.simplecast.com/gvtxUiIf" },
      { title: "InfoQ", url: "https://feed.infoq.com" },
      { title: "Instagram Engineering", url: "https://instagram-engineering.com/feed/" },
      { title: "jOOQ Blog", url: "https://blog.jooq.org/feed" },
      { title: "JetBrains Blog", url: "https://blog.jetbrains.com/feed" },
      { title: "Joel on Software", url: "https://www.joelonsoftware.com/feed/" },
      { title: "LinkedIn Engineering", url: "https://engineering.linkedin.com/blog.rss.html" },
      { title: "Martin Fowler", url: "https://martinfowler.com/feed.atom" },
      { title: "Netflix Tech Blog", url: "https://netflixtechblog.com/feed" },
      { title: "Buffer Overflow", url: "https://buffer.com/resources/overflow/rss/" },
      { title: "Software Engineering Daily", url: "https://softwareengineeringdaily.com/category/podcast/feed" },
      { title: "Prezi Engineering", url: "https://engineering.prezi.com/feed" },
      { title: "Programming Throwdown", url: "http://feeds.feedburner.com/ProgrammingThrowdown" },
      { title: "The Crazy Programmer", url: "https://www.thecrazyprogrammer.com/category/programming/feed" },
      { title: "Robert Heaton", url: "https://robertheaton.com/feed.xml" },
      { title: "Scott Hanselman", url: "http://feeds.hanselman.com/ScottHanselman" },
      { title: "Scripting News", url: "http://scripting.com/rss.xml" },
      { title: "Signal v. Noise", url: "https://m.signalvnoise.com/feed/" },
      { title: "Slack Engineering", url: "https://slack.engineering/feed" },
      { title: "Software Defined Talk", url: "https://feeds.fireside.fm/sdt/rss" },
      { title: "SE Radio Podcast", url: "http://feeds.feedburner.com/se-radio" },
      { title: "SoundCloud Backstage", url: "https://developers.soundcloud.com/blog/blog.rss" },
      { title: "Spotify Engineering", url: "https://labs.spotify.com/feed/" },
      { title: "Stack Abuse", url: "https://stackabuse.com/rss/" },
      { title: "Stack Overflow Blog", url: "https://stackoverflow.blog/feed/" },
      { title: "The 6 Figure Developer", url: "http://6figuredev.com/feed/rss/" },
      { title: "Airbnb Engineering", url: "https://medium.com/feed/airbnb-engineering" },
      { title: "The Cynical Developer", url: "https://cynicaldeveloper.com/feed/podcast" },
      { title: "r/programming", url: "https://www.reddit.com/r/programming/.rss" },
    ],
  },
  {
    title: "Web Development",
    image: "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=900&q=80",
    feeds: [
      { title: "A List Apart", url: "https://alistapart.com/main/feed/" },
      { title: "CSS-Tricks", url: "https://css-tricks.com/feed/" },
      { title: "Code Wall", url: "https://www.codewall.co.uk/feed/" },
      { title: "David Walsh Blog", url: "https://davidwalsh.name/feed" },
      { title: "Mozilla Hacks", url: "https://hacks.mozilla.org/feed/" },
      { title: "web.dev", url: "https://web.dev/feed.xml" },
      { title: "DEV Community", url: "https://dev.to/feed" },
      { title: "Smashing Magazine", url: "https://www.smashingmagazine.com/feed" },
      { title: "freeCodeCamp", url: "https://www.freecodecamp.org/news/rss/" },
    ],
  },
  {
    title: "Android",
    image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=900&q=80",
    feeds: [
      { title: "All About Android", url: "https://feeds.twit.tv/aaa.xml" },
      { title: "Android (Google Blog)", url: "https://blog.google/products/android/rss" },
      { title: "r/Android", url: "https://www.reddit.com/r/android/.rss" },
      { title: "Android Authority", url: "https://www.androidauthority.com/feed" },
      { title: "Android Authority Podcast", url: "https://androidauthority.libsyn.com/rss" },
      { title: "Android Central", url: "http://feeds.androidcentral.com/androidcentral" },
      { title: "Android Central Podcast", url: "http://feeds.feedburner.com/AndroidCentralPodcast" },
      { title: "Android Community", url: "https://androidcommunity.com/feed/" },
      { title: "Android Police", url: "http://feeds.feedburner.com/AndroidPolice" },
      { title: "AndroidGuys", url: "https://www.androidguys.com/feed" },
      { title: "Cult of Android", url: "https://www.cultofandroid.com/feed" },
      { title: "Cyanogen Mods", url: "https://www.cyanogenmods.org/feed" },
      { title: "Droid Life", url: "https://www.droid-life.com/feed" },
      { title: "GSMArena", url: "https://www.gsmarena.com/rss-news-reviews.php3" },
      { title: "Phandroid", url: "http://feeds2.feedburner.com/AndroidPhoneFans" },
      { title: "TalkAndroid", url: "http://feeds.feedburner.com/AndroidNewsGoogleAndroidForums" },
      { title: "XDA Developers", url: "https://data.xda-developers.com/portal-feed" },
    ],
  },
  {
    title: "Android Development",
    image: "https://images.unsplash.com/photo-1526498460520-4c246339dccb?w=900&q=80",
    feeds: [
      { title: "Android - Buffer", url: "https://buffer.com/resources/android/rss/" },
      { title: "Android Developers (Medium)", url: "https://medium.com/feed/androiddevelopers" },
      { title: "Android Developers Backstage", url: "http://feeds.feedburner.com/blogspot/androiddevelopersbackstage" },
      { title: "Android Developers Blog", url: "http://feeds.feedburner.com/blogspot/hsDu" },
      { title: "Android Weekly", url: "https://us2.campaign-archive.com/feed?u=887caf4f48db76fd91e20a06d&id=4eb677ad19" },
      { title: "Dan Lew Codes", url: "https://blog.danlew.net/rss/" },
      { title: "r/androiddev", url: "https://reddit.com/r/androiddev.rss" },
      { title: "Fragmented Podcast", url: "https://feeds.simplecast.com/LpAGSLnY" },
      { title: "Handstand Sam", url: "https://handstandsam.com/feed/" },
      { title: "Jake Wharton", url: "https://jakewharton.com/atom.xml" },
      { title: "Joe Birch", url: "https://joebirch.co/feed" },
      { title: "Kt. Academy", url: "https://blog.kotlin-academy.com/feed" },
      { title: "OkKotlin", url: "https://okkotlin.com/rss.xml" },
      { title: "ProAndroidDev", url: "https://proandroiddev.com/feed" },
      { title: "Public Object", url: "https://publicobject.com/rss/" },
      { title: "Saket Narayan", url: "https://saket.me/feed/" },
      { title: "Styling Android", url: "http://feeds.feedburner.com/StylingAndroid" },
      { title: "Talking Kotlin", url: "https://feeds.soundcloud.com/users/soundcloud:users:280353173/sounds.rss" },
      { title: "The Android Arsenal", url: "https://feeds.feedburner.com/Android_Arsenal" },
      { title: "Zac Sweers", url: "https://www.zacsweers.dev/rss/" },
      { title: "Zarah Dominguez", url: "https://zarah.dev/feed.xml" },
      { title: "chRyNaN Codes", url: "https://chrynan.codes/rss/" },
      { title: "goobar", url: "https://goobar.io/feed" },
      { title: "zsmb.co", url: "https://zsmb.co/index.xml" },
    ],
  },
  {
    title: "Apple",
    image: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=900&q=80",
    feeds: [
      { title: "9to5Mac", url: "https://9to5mac.com/feed" },
      { title: "Apple Newsroom", url: "https://www.apple.com/newsroom/rss-feed.rss" },
      { title: "AppleInsider", url: "https://appleinsider.com/rss/news/" },
      { title: "Cult of Mac", url: "https://www.cultofmac.com/feed" },
      { title: "Daring Fireball", url: "https://daringfireball.net/feeds/main" },
      { title: "MacRumors", url: "http://feeds.macrumors.com/MacRumors-Mac" },
      { title: "MacStories", url: "https://www.macstories.net/feed" },
      { title: "Macworld", url: "https://www.macworld.com/index.rss" },
      { title: "Marco.org", url: "https://marco.org/rss" },
      { title: "OS X Daily", url: "http://feeds.feedburner.com/osxdaily" },
      { title: "The Loop", url: "https://www.loopinsight.com/feed" },
      { title: "r/Apple", url: "https://www.reddit.com/r/apple/.rss" },
      { title: "iMore", url: "http://feeds.feedburner.com/TheiPhoneBlog" },
      { title: "r/iPhone", url: "https://www.reddit.com/r/iphone/.rss" },
    ],
  },
  {
    title: "iOS Development",
    image: "https://images.unsplash.com/photo-1621839673705-6617adf9e890?w=900&q=80",
    feeds: [
      { title: "Devchat.tv All Shows", url: "https://feeds.feedwrench.com/all-shows-devchattv.rss" },
      { title: "Alberto De Bortoli", url: "https://albertodebortoli.com/rss/" },
      { title: "Augmented Code", url: "https://augmentedcode.io/feed/" },
      { title: "Benoit Pasquier", url: "https://benoitpasquier.com/index.xml" },
      { title: "Fabisevi.ch", url: "https://www.fabisevi.ch/feed.xml" },
      { title: "Mobile A11y", url: "https://mobilea11y.com/index.xml" },
      { title: "More Than Just Code", url: "https://feeds.fireside.fm/mtjc/rss" },
      { title: "Apple Developer News", url: "https://developer.apple.com/news/rss/news.rss" },
      { title: "Ole Begemann", url: "https://oleb.net/blog/atom.xml" },
      { title: "Pavel Zak", url: "https://nerdyak.tech/feed.xml" },
      { title: "Swift by Sundell", url: "https://www.swiftbysundell.com/feed.rss" },
      { title: "SwiftRocks", url: "https://swiftrocks.com/rss.xml" },
      { title: "The Atomic Birdhouse", url: "https://atomicbird.com/index.xml" },
      { title: "Under the Radar", url: "https://www.relay.fm/radar/feed" },
      { title: "Use Your Loaf", url: "https://useyourloaf.com/blog/rss.xml" },
      { title: "inessential.com", url: "https://inessential.com/xml/rss.xml" },
      { title: "tyler.io", url: "https://tyler.io/feed/" },
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
      { title: "CMU ML Blog", url: "https://blog.ml.cmu.edu/feed/" },
      { title: "Lil'Log (Lilian Weng)", url: "https://lilianweng.github.io/lil-log/feed.xml" },
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
      { title: "Cyberciti (Linux/Unix)", url: "https://www.cyberciti.com/feed/" },
      { title: "Tecmint", url: "https://www.tecmint.com/feed/" },
      { title: "Linux Hint", url: "https://linuxhint.com/feed/" },
      { title: "OMG! Ubuntu!", url: "https://www.omgubuntu.co.uk/feed" },
      { title: "Linux Handbook", url: "https://linuxhandbook.com/rss/" },
      { title: "TecAdmin", url: "https://tecadmin.net/feed/" },
      { title: "It's FOSS", url: "https://itsfoss.com/feed/" },
      { title: "Kubernetes Blog", url: "https://kubernetes.io/feed.xml" },
      { title: "Docker Blog", url: "https://www.docker.com/blog/feed/" },
    ],
  },
  {
    title: "Cyber Security",
    image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=900&q=80",
    feeds: [
      { title: "The Hacker News", url: "https://feeds.feedburner.com/TheHackersNews" },
      { title: "BleepingComputer", url: "https://www.bleepingcomputer.com/feed/" },
      { title: "Sophos Naked Security", url: "https://nakedsecurity.sophos.com/feed" },
      { title: "Malwarebytes", url: "https://www.malwarebytes.com/blog/feed/index.xml" },
      { title: "Security Intelligence", url: "https://securityintelligence.com/feed/" },
      { title: "Krebs on Security", url: "https://krebsonsecurity.com/feed/" },
      { title: "Dark Reading", url: "https://www.darkreading.com/rss.xml" },
    ],
  },
  // =====================================================
  // BUSINESS & FINANCE
  // =====================================================
  {
    title: "Business & Economy",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=900&q=80",
    feeds: [
      { title: "Investing.com", url: "https://www.investing.com/rss/news.rss" },
      { title: "Seeking Alpha", url: "https://seekingalpha.com/market_currents.xml" },
      { title: "Duct Tape Marketing", url: "https://ducttape.libsyn.com/rss" },
      { title: "Economic Times", url: "https://economictimes.indiatimes.com/rssfeedsdefault.cms" },
      { title: "Forbes Business", url: "https://www.forbes.com/business/feed/" },
      { title: "Fortune", url: "https://fortune.com/feed" },
      { title: "HBR IdeaCast", url: "http://feeds.harvardbusiness.org/harvardbusiness/ideacast" },
      { title: "Business Standard", url: "https://www.business-standard.com/rss/home_page_top_stories.rss" },
      { title: "How I Built This", url: "https://feeds.npr.org/510313/podcast.xml" },
      { title: "Mixergy Startup Stories", url: "https://feeds.feedburner.com/Mixergy-main-podcast" },
      { title: "Tim Ferriss Blog", url: "https://tim.blog/feed/" },
      { title: "The Growth Show", url: "http://thegrowthshow.hubspot.libsynpro.com/" },
      { title: "CNBC Top News", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html" },
      { title: "Yahoo Finance", url: "https://finance.yahoo.com/news/rssindex" },
    ],
  },
  {
    title: "Startups",
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=900&q=80",
    feeds: [
      { title: "AVC (Fred Wilson)", url: "https://avc.com/feed/" },
      { title: "Both Sides of the Table", url: "https://bothsidesofthetable.com/feed" },
      { title: "Entrepreneur", url: "http://feeds.feedburner.com/entrepreneur/latest" },
      { title: "Feld Thoughts", url: "https://feld.com/feed" },
      { title: "Forbes Entrepreneurs", url: "https://www.forbes.com/entrepreneurs/feed/" },
      { title: "Hacker News Front Page", url: "https://hnrss.org/frontpage" },
      { title: "Inc.com", url: "https://www.inc.com/rss/" },
      { title: "Inside Intercom", url: "https://www.intercom.com/blog/feed" },
      { title: "Masters of Scale", url: "https://rss.art19.com/masters-of-scale" },
      { title: "Paul Graham Essays", url: "http://www.aaronsw.com/2002/feeds/pgessays.rss" },
      { title: "Product Hunt", url: "https://www.producthunt.com/feed" },
      { title: "Quick Sprout", url: "https://www.quicksprout.com/rss" },
      { title: "Small Business Trends", url: "https://feeds2.feedburner.com/SmallBusinessTrends" },
      { title: "Smart Passive Income", url: "http://feeds.feedburner.com/smartpassiveincome" },
      { title: "Springwise", url: "https://www.springwise.com/feed" },
      { title: "Steve Blank", url: "https://steveblank.com/feed/" },
      { title: "Startup Junkies Podcast", url: "https://startupjunkie.libsyn.com/rss" },
      { title: "The Tim Ferriss Show", url: "https://rss.art19.com/tim-ferriss-show" },
      { title: "This Week in Startups", url: "http://feeds.feedburner.com/twistvid" },
      { title: "VentureBeat", url: "https://feeds.feedburner.com/venturebeat/SZYF" },
      { title: "Y Combinator Blog", url: "https://www.ycombinator.com/blog/rss/" },
      { title: "Stratechery", url: "http://stratechery.com/feed/" },
    ],
  },
  {
    title: "Personal Finance",
    image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=900&q=80",
    feeds: [
      { title: "Afford Anything", url: "https://affordanything.com/feed/" },
      { title: "Student Loan Hero", url: "https://studentloanhero.com/blog/feed" },
      { title: "Budgets Are Sexy", url: "https://feeds2.feedburner.com/budgetsaresexy" },
      { title: "Financial Samurai", url: "https://www.financialsamurai.com/feed/" },
      { title: "Frugalwoods", url: "https://feeds.feedburner.com/Frugalwoods" },
      { title: "Get Rich Slowly", url: "https://www.getrichslowly.org/feed/" },
      { title: "Good Financial Cents", url: "https://www.goodfinancialcents.com/feed/" },
      { title: "I Will Teach You To Be Rich", url: "https://www.iwillteachyoutoberich.com/feed/" },
      { title: "Learn To Trade The Market", url: "https://www.learntotradethemarket.com/feed" },
      { title: "Making Sense Of Cents", url: "https://www.makingsenseofcents.com/feed" },
      { title: "Millennial Money", url: "https://millennialmoney.com/feed/" },
      { title: "MintLife Blog", url: "https://blog.mint.com/feed/" },
      { title: "Money Crashers", url: "https://www.moneycrashers.com/feed/" },
      { title: "Money Saving Mom", url: "https://moneysavingmom.com/feed/" },
      { title: "Money Under 30", url: "https://www.moneyunder30.com/feed" },
      { title: "MoneyNing", url: "http://feeds.feedburner.com/MoneyNing" },
      { title: "MyWifeQuitHerJob", url: "https://mywifequitherjob.com/feed/" },
      { title: "Kitces Nerd's Eye View", url: "http://feeds.feedblitz.com/kitcesnerdseyeview&x=1" },
      { title: "NerdWallet", url: "https://www.nerdwallet.com/blog/feed/" },
      { title: "Oblivious Investor", url: "https://obliviousinvestor.com/feed/" },
      { title: "r/personalfinance", url: "https://reddit.com/r/personalfinance/.rss" },
      { title: "SavingAdvice", url: "https://www.savingadvice.com/feed/" },
      { title: "Side Hustle Nation", url: "https://www.sidehustlenation.com/feed" },
      { title: "The College Investor", url: "https://thecollegeinvestor.com/feed/" },
      { title: "The Dough Roller", url: "https://www.doughroller.net/feed/" },
      { title: "The Penny Hoarder", url: "https://www.thepennyhoarder.com/feed/" },
      { title: "Well Kept Wallet", url: "https://wellkeptwallet.com/feed/" },
      { title: "Wise Bread", url: "http://feeds.killeraces.com/wisebread" },
    ],
  },
  {
    title: "Financial Services",
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=900&q=80",
    feeds: [
      { title: "Calculated Risk", url: "https://www.calculatedriskblog.com/feeds/posts/default" },
      { title: "Finextra", url: "https://www.finextra.com/rss/finextra-news.aspx" },
      { title: "American Banker", url: "https://www.americanbanker.com/feed" },
    ],
  },
  // =====================================================
  // NEWS & WORLD
  // =====================================================
  {
    title: "World News",
    image: "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=900&q=80",
    feeds: [
      { title: "BBC News - World", url: "http://feeds.bbci.co.uk/news/world/rss.xml" },
      { title: "CNN World", url: "http://rss.cnn.com/rss/edition_world.rss" },
      { title: "CNBC International", url: "https://www.cnbc.com/id/100727362/device/rss/rss.html" },
      { title: "NDTV World", url: "http://feeds.feedburner.com/ndtvnews-world-news" },
      { title: "NYT World", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml" },
      { title: "Google News Top Stories", url: "https://news.google.com/rss" },
      { title: "Washington Post World", url: "http://feeds.washingtonpost.com/rss/world" },
      { title: "r/worldnews", url: "https://www.reddit.com/r/worldnews/.rss" },
      { title: "The Guardian World", url: "https://www.theguardian.com/world/rss" },
      { title: "Yahoo News", url: "https://www.yahoo.com/news/rss" },
      { title: "HuffPost World", url: "https://www.huffpost.com/section/world-news/feed" },
      { title: "NYT Home", url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml" },
      { title: "FOX News", url: "http://feeds.foxnews.com/foxnews/latest" },
      { title: "WSJ World", url: "https://feeds.a.dj.com/rss/RSSWorldNews.xml" },
      { title: "LA Times World", url: "https://www.latimes.com/world-nation/rss2.0.xml" },
      { title: "Politico Playbook", url: "https://rss.politico.com/playbook.xml" },
    ],
  },
  {
    title: "US News",
    image: "https://images.unsplash.com/photo-1501466044931-62695aada8e9?w=900&q=80",
    feeds: [
      { title: "HuffPost World", url: "https://www.huffpost.com/section/world-news/feed" },
      { title: "NYT Top Stories", url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml" },
      { title: "FOX News", url: "http://feeds.foxnews.com/foxnews/latest" },
      { title: "Washington Post World", url: "http://feeds.washingtonpost.com/rss/world" },
      { title: "WSJ World", url: "https://feeds.a.dj.com/rss/RSSWorldNews.xml" },
      { title: "LA Times World & Nation", url: "https://www.latimes.com/world-nation/rss2.0.xml" },
      { title: "CNN Edition", url: "http://rss.cnn.com/rss/edition.rss" },
      { title: "Yahoo News", url: "https://news.yahoo.com/rss/mostviewed" },
      { title: "CNBC US Top News", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html" },
      { title: "Politico Playbook", url: "https://rss.politico.com/playbook.xml" },
      { title: "Axios", url: "https://api.axios.com/feed/" },
    ],
  },
  {
    title: "UK News",
    image: "https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=900&q=80",
    feeds: [
      { title: "BBC News Home", url: "http://feeds.bbci.co.uk/news/rss.xml" },
      { title: "The Guardian World", url: "https://www.theguardian.com/world/rss" },
      { title: "Daily Mail Home", url: "https://www.dailymail.co.uk/home/index.rss" },
      { title: "The Independent UK", url: "http://www.independent.co.uk/news/uk/rss" },
      { title: "Daily Express", url: "http://feeds.feedburner.com/daily-express-news-showbiz" },
    ],
  },
  {
    title: "India News",
    image: "https://images.unsplash.com/photo-1532664189809-02133fee698d?w=900&q=80",
    feeds: [
      { title: "BBC News India", url: "http://feeds.bbci.co.uk/news/world/asia/india/rss.xml" },
      { title: "The Guardian India", url: "https://www.theguardian.com/world/india/rss" },
      { title: "Times of India", url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms" },
      { title: "The Hindu", url: "https://www.thehindu.com/feeder/default.rss" },
      { title: "NDTV Top Stories", url: "https://feeds.feedburner.com/ndtvnews-top-stories" },
      { title: "India Today", url: "https://www.indiatoday.in/rss/home" },
      { title: "Indian Express", url: "http://indianexpress.com/print/front-page/feed/" },
      { title: "News18 World", url: "https://www.news18.com/rss/world.xml" },
      { title: "DNA India", url: "https://www.dnaindia.com/feeds/india.xml" },
      { title: "Firstpost India", url: "https://www.firstpost.com/rss/india.xml" },
      { title: "Business Standard", url: "https://www.business-standard.com/rss/home_page_top_stories.rss" },
      { title: "Outlook India", url: "https://www.outlookindia.com/rss/main/magazine" },
      { title: "Free Press Journal", url: "https://www.freepressjournal.in/stories.rss" },
      { title: "Deccan Chronicle", url: "https://www.deccanchronicle.com/rss_feed/" },
      { title: "Moneycontrol", url: "http://www.moneycontrol.com/rss/latestnews.xml" },
      { title: "Economic Times", url: "https://economictimes.indiatimes.com/rssfeedsdefault.cms" },
      { title: "Oneindia", url: "https://www.oneindia.com/rss/news-fb.xml" },
      { title: "Scroll.in", url: "http://feeds.feedburner.com/ScrollinArticles.rss" },
      { title: "Financial Express", url: "https://www.financialexpress.com/feed/" },
      { title: "Business Line", url: "https://www.thehindubusinessline.com/feeder/default.rss" },
      { title: "ThePrint", url: "https://theprint.in/feed/" },
      { title: "Swarajya", url: "https://prod-qt-images.s3.amazonaws.com/production/swarajya/feed.xml" },
    ],
  },
  {
    title: "Australia News",
    image: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=900&q=80",
    feeds: [
      { title: "Daily Telegraph", url: "https://www.dailytelegraph.com.au/news/breaking-news/rss" },
      { title: "Sydney Morning Herald", url: "https://www.smh.com.au/rss/feed.xml" },
      { title: "Herald Sun", url: "https://www.heraldsun.com.au/news/breaking-news/rss" },
      { title: "ABC News", url: "https://www.abc.net.au/news/feed/1948/rss.xml" },
      { title: "The Age", url: "https://www.theage.com.au/rss/feed.xml" },
      { title: "The Courier Mail", url: "https://www.couriermail.com.au/rss" },
      { title: "PerthNow", url: "https://www.perthnow.com.au/news/feed" },
      { title: "Canberra Times", url: "https://www.canberratimes.com.au/rss.xml" },
      { title: "Brisbane Times", url: "https://www.brisbanetimes.com.au/rss/feed.xml" },
      { title: "Independent Australia", url: "http://feeds.feedburner.com/IndependentAustralia" },
      { title: "Business News", url: "https://www.businessnews.com.au/rssfeed/latest.rss" },
      { title: "InDaily", url: "https://indaily.com.au/feed/" },
      { title: "The Mercury", url: "https://www.themercury.com.au/rss" },
      { title: "Crikey", url: "https://feeds.feedburner.com/com/rCTl" },
    ],
  },
  {
    title: "Canada News",
    image: "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=900&q=80",
    feeds: [
      { title: "CBC Top Stories", url: "https://www.cbc.ca/cmlink/rss-topstories" },
      { title: "CTV News", url: "https://www.ctvnews.ca/rss/ctvnews-ca-top-stories-public-rss-1.822009" },
      { title: "Global News", url: "https://globalnews.ca/feed/" },
      { title: "Financial Post", url: "https://business.financialpost.com/feed/" },
      { title: "National Post", url: "https://nationalpost.com/feed/" },
      { title: "Ottawa Citizen", url: "https://ottawacitizen.com/feed/" },
      { title: "The Province", url: "https://theprovince.com/feed/" },
      { title: "LaPresse", url: "https://www.lapresse.ca/actualites/rss" },
      { title: "Toronto Star", url: "https://www.thestar.com/content/thestar/feed.RSSManagerServlet.articles.topstories.rss" },
      { title: "Toronto Sun", url: "https://torontosun.com/category/news/feed" },
    ],
  },
  {
    title: "Germany News",
    image: "https://images.unsplash.com/photo-1554072675-66db59dba46f?w=900&q=80",
    feeds: [
      { title: "ZEIT Online", url: "http://newsfeed.zeit.de/index" },
      { title: "FOCUS Online", url: "https://rss.focus.de/fol/XML/rss_folnews.xml" },
      { title: "FAZ Aktuell", url: "https://www.faz.net/rss/aktuell/" },
      { title: "Tagesschau", url: "http://www.tagesschau.de/xml/rss2" },
      { title: "Deutsche Welle", url: "https://rss.dw.com/rdf/rss-en-all" },
    ],
  },
  {
    title: "France News",
    image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=900&q=80",
    feeds: [
      { title: "France24", url: "https://www.france24.com/en/rss" },
      { title: "Mediapart", url: "https://www.mediapart.fr/articles/feed" },
      { title: "Le Monde", url: "https://www.lemonde.fr/rss/une.xml" },
      { title: "L'Obs", url: "https://www.nouvelobs.com/a-la-une/rss.xml" },
      { title: "Franceinfo", url: "https://www.francetvinfo.fr/titres.rss" },
      { title: "Le Huffington Post", url: "https://www.huffingtonpost.fr/feeds/index.xml" },
      { title: "La Dépêche", url: "https://www.ladepeche.fr/rss.xml" },
      { title: "Sud Ouest", url: "https://www.sudouest.fr/essentiel/rss.xml" },
      { title: "Ouest-France", url: "https://www.ouest-france.fr/rss-en-continu.xml" },
    ],
  },
  {
    title: "Spain News",
    image: "https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=900&q=80",
    feeds: [
      { title: "The Local Spain", url: "https://feeds.thelocal.com/rss/es" },
      { title: "El País", url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada" },
      { title: "El Confidencial", url: "https://rss.elconfidencial.com/espana/" },
      { title: "ElDiario.es", url: "https://www.eldiario.es/rss/" },
      { title: "Expansión", url: "https://e00-expansion.uecdn.es/rss/portada.xml" },
      { title: "El Periódico", url: "https://www.elperiodico.com/es/rss/rss_portada.xml" },
      { title: "HuffPost España", url: "https://www.huffingtonpost.es/feeds/index.xml" },
      { title: "Euro Weekly News", url: "https://www.euroweeklynews.com/feed/" },
      { title: "EFE English", url: "https://www.efe.com/efe/english/4/rss" },
    ],
  },
  {
    title: "Italy News",
    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=900&q=80",
    feeds: [
      { title: "ANSA", url: "https://www.ansa.it/sito/ansait_rss.xml" },
      { title: "The Local Italy", url: "https://feeds.thelocal.com/rss/it" },
      { title: "DiariodelWeb", url: "https://www.diariodelweb.it/rss/home/" },
      { title: "Fanpage", url: "https://www.fanpage.it/feed/" },
      { title: "Libero Quotidiano", url: "https://www.liberoquotidiano.it/rss.xml" },
      { title: "Adnkronos", url: "http://rss.adnkronos.com/RSS_PrimaPagina.xml" },
      { title: "Internazionale", url: "https://www.internazionale.it/sitemaps/rss.xml" },
      { title: "Panorama", url: "https://www.panorama.it/feeds/feed.rss" },
      { title: "The Guardian Italy", url: "https://www.theguardian.com/world/italy/rss" },
      { title: "Repubblica", url: "https://www.repubblica.it/rss/homepage/rss2.0.xml" },
      { title: "Il Post", url: "https://www.ilpost.it/feed/" },
    ],
  },
  {
    title: "Japan News",
    image: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=900&q=80",
    feeds: [
      { title: "Japan Times", url: "https://www.japantimes.co.jp/feed/topstories/" },
      { title: "Japan Today", url: "https://japantoday.com/feed" },
      { title: "News On Japan", url: "http://www.newsonjapan.com/rss/top.xml" },
      { title: "Kyodo News+", url: "https://english.kyodonews.net/rss/all.xml" },
      { title: "NYT Japan", url: "https://www.nytimes.com/svc/collections/v1/publish/http://www.nytimes.com/topic/destination/japan/rss.xml" },
    ],
  },
  {
    title: "Russia News",
    image: "https://images.unsplash.com/photo-1547448415-e9f5b28e570d?w=900&q=80",
    feeds: [
      { title: "Lenta.ru", url: "https://lenta.ru/rss" },
      { title: "Vesti.ru", url: "https://www.vesti.ru/vesti.rss" },
      { title: "Gazeta.ru", url: "https://www.gazeta.ru/export/rss/first.xml" },
      { title: "Moskovskiy Komsomolets", url: "https://www.mk.ru/rss/index.xml" },
      { title: "Rossiyskaya Gazeta", url: "https://rg.ru/xml/index.xml" },
      { title: "NEWSru.com", url: "https://rss.newsru.com/top/big/" },
      { title: "RT", url: "https://www.rt.com/rss/" },
      { title: "Meduza", url: "https://meduza.io/rss/all" },
      { title: "TASS", url: "http://tass.com/rss/v2.xml" },
      { title: "The Moscow Times", url: "https://www.themoscowtimes.com/rss/news" },
      { title: "Kommersant", url: "https://www.kommersant.ru/RSS/main.xml" },
    ],
  },
  {
    title: "Brazil News",
    image: "https://images.unsplash.com/photo-1516306580123-e6e52b1b7b5f?w=900&q=80",
    feeds: [
      { title: "Folha de S.Paulo", url: "https://feeds.folha.uol.com.br/emcimadahora/rss091.xml" },
      { title: "Portal EBC", url: "http://www.ebc.com.br/rss/feed.xml" },
      { title: "R7 Notícias", url: "https://noticias.r7.com/feed.xml" },
      { title: "UOL", url: "http://rss.home.uol.com.br/index.xml" },
      { title: "The Rio Times", url: "https://riotimesonline.com/feed/" },
      { title: "Brasil Wire", url: "http://www.brasilwire.com/feed/" },
      { title: "Jornal de Brasília", url: "https://jornaldebrasilia.com.br/feed/" },
    ],
  },
  {
    title: "Mexico News",
    image: "https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=900&q=80",
    feeds: [
      { title: "The Guardian Mexico", url: "https://www.theguardian.com/world/mexico/rss" },
      { title: "Excélsior", url: "https://www.excelsior.com.mx/rss.xml" },
      { title: "Reforma", url: "https://www.reforma.com/rss/portada.xml" },
      { title: "Vanguardia MX", url: "https://vanguardia.com.mx/rss.xml" },
      { title: "El Siglo de Torreón", url: "https://www.elsiglodetorreon.com.mx/index.xml" },
      { title: "El Financiero", url: "https://www.elfinanciero.com.mx/arc/outboundfeeds/rss/?outputType=xml" },
      { title: "El Informador", url: "https://www.informador.mx/rss/ultimas-noticias.xml" },
      { title: "24 Horas", url: "https://www.24-horas.mx/feed/" },
      { title: "DEBATE", url: "https://www.debate.com.mx/rss/feed.xml" },
      { title: "Mexico News Daily", url: "https://mexiconewsdaily.com/feed/" },
    ],
  },
  {
    title: "South Africa News",
    image: "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=900&q=80",
    feeds: [
      { title: "SowetanLIVE", url: "https://www.sowetanlive.co.za/rss/?publication=sowetan-live" },
      { title: "BusinessTech", url: "https://businesstech.co.za/news/feed/" },
      { title: "TechCentral", url: "https://techcentral.co.za/feed" },
      { title: "News24", url: "http://feeds.news24.com/articles/news24/TopStories/rss" },
      { title: "Eyewitness News", url: "https://ewn.co.za/RSS%20Feeds/Latest%20News" },
      { title: "The Citizen", url: "https://citizen.co.za/feed/" },
      { title: "Daily Maverick", url: "https://www.dailymaverick.co.za/dmrss/" },
      { title: "Moneyweb", url: "https://www.moneyweb.co.za/feed/" },
      { title: "IOL News", url: "http://rss.iol.io/iol/news" },
      { title: "TimesLIVE", url: "https://www.timeslive.co.za/rss/" },
      { title: "The South African", url: "https://www.thesouthafrican.com/feed/" },
    ],
  },
  // =====================================================
  // SCIENCE & SPACE
  // =====================================================
  {
    title: "Science",
    image: "https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=900&q=80",
    feeds: [
      { title: "60-Second Science", url: "http://rss.sciam.com/sciam/60secsciencepodcast" },
      { title: "BBC Science & Environment", url: "http://feeds.bbci.co.uk/news/science_and_environment/rss.xml" },
      { title: "BBC Discovery", url: "https://podcasts.files.bbci.co.uk/p002w557.rss" },
      { title: "FlowingData", url: "https://flowingdata.com/feed" },
      { title: "Gastropod", url: "https://www.omnycontent.com/d/playlist/aaea4e69-af51-495e-afc9-a9760146922b/2a195077-f014-41d2-8313-ab190186b4c2/277bcd5c-0a05-4c14-8ba6-ab190186b4d5/podcast.rss" },
      { title: "Gizmodo Science", url: "https://gizmodo.com/tag/science/rss" },
      { title: "Hidden Brain", url: "https://feeds.npr.org/510308/podcast.xml" },
      { title: "Invisibilia", url: "https://feeds.npr.org/510307/podcast.xml" },
      { title: "ScienceDaily", url: "https://www.sciencedaily.com/rss/all.xml" },
      { title: "NYT Science", url: "https://rss.nytimes.com/services/xml/rss/nyt/Science.xml" },
      { title: "Nature", url: "https://www.nature.com/nature.rss" },
      { title: "Phys.org", url: "https://phys.org/rss-feed/" },
      { title: "Probably Science", url: "https://probablyscience.libsyn.com/rss" },
      { title: "Radiolab", url: "http://feeds.wnyc.org/radiolab" },
      { title: "r/science", url: "https://reddit.com/r/science/.rss" },
      { title: "Sawbones", url: "https://feeds.simplecast.com/y1LF_sn2" },
      { title: "Wired Science", url: "https://www.wired.com/feed/category/science/latest/rss" },
      { title: "Science Vs", url: "http://feeds.gimletmedia.com/ScienceVs" },
      { title: "Science-Based Medicine", url: "https://sciencebasedmedicine.org/feed/" },
      { title: "Scientific American", url: "http://rss.sciam.com/ScientificAmerican-Global" },
      { title: "Shirtloads of Science", url: "https://shirtloadsofscience.libsyn.com/rss" },
      { title: "TED Talks Daily", url: "https://pa.tedcdn.com/feeds/talks.rss" },
      { title: "Infinite Monkey Cage", url: "https://podcasts.files.bbci.co.uk/b00snr0w.rss" },
      { title: "This Week in Science", url: "http://www.twis.org/feed/" },
    ],
  },
  {
    title: "Space",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=900&q=80",
    feeds: [
      { title: "r/space", url: "https://www.reddit.com/r/space/.rss?format=xml" },
      { title: "NASA Breaking News", url: "https://www.nasa.gov/rss/dyn/breaking_news.rss" },
      { title: "New Scientist Space", url: "https://www.newscientist.com/subject/space/feed/" },
      { title: "Sky & Telescope", url: "https://www.skyandtelescope.com/feed/" },
      { title: "The Guardian Space", url: "https://www.theguardian.com/science/space/rss" },
      { title: "Space.com", url: "https://www.space.com/feeds/all" },
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
      { title: "r/sports", url: "https://www.reddit.com/r/sports.rss" },
      { title: "Sky Sports News", url: "http://feeds.skynews.com/feeds/rss/sports.xml" },
      { title: "Sportskeeda", url: "https://www.sportskeeda.com/feed" },
      { title: "Yahoo Sports", url: "https://sports.yahoo.com/rss/" },
      { title: "ESPN Top", url: "https://www.espn.com/espn/rss/news" },
    ],
  },
  {
    title: "Football (Soccer)",
    image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900&q=80",
    feeds: [
      { title: "r/Championship", url: "https://www.reddit.com/r/Championship/.rss?format=xml" },
      { title: "r/football", url: "https://www.reddit.com/r/football/.rss?format=xml" },
      { title: "Goal.com", url: "https://www.goal.com/feeds/en/news" },
      { title: "Football365", url: "https://www.football365.com/feed" },
      { title: "Soccer News", url: "https://www.soccernews.com/feed" },
    ],
  },
  {
    title: "Cricket",
    image: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=900&q=80",
    feeds: [
      { title: "BBC Cricket", url: "http://feeds.bbci.co.uk/sport/cricket/rss.xml" },
      { title: "Can't Bowl Can't Throw", url: "http://feeds.feedburner.com/cantbowlcantthrow" },
      { title: "r/Cricket", url: "https://www.reddit.com/r/Cricket/.rss" },
      { title: "Cricket Unfiltered", url: "https://rss.acast.com/cricket-unfiltered" },
      { title: "ESPN Cricinfo", url: "http://www.espncricinfo.com/rss/content/story/feeds/0.xml" },
      { title: "The Guardian Cricket", url: "https://www.theguardian.com/sport/cricket/rss" },
      { title: "The Roar Cricket", url: "https://www.theroar.com.au/cricket/feed/" },
      { title: "NDTV Cricket", url: "http://feeds.feedburner.com/ndtvsports-cricket" },
      { title: "Sky Sports Cricket", url: "https://www.spreaker.com/show/3387348/episodes/feed" },
      { title: "Stumped (BBC)", url: "https://podcasts.files.bbci.co.uk/p02gsrmh.rss" },
      { title: "Switch Hit Podcast", url: "https://feeds.megaphone.fm/ESP9247246951" },
      { title: "Tailenders", url: "https://podcasts.files.bbci.co.uk/p02pcb4w.rss" },
      { title: "Test Match Special", url: "https://podcasts.files.bbci.co.uk/p02nrsl2.rss" },
      { title: "The Analyst Inside Cricket", url: "http://rss.acast.com/theanalystinsidecricket" },
      { title: "The Grade Cricketer", url: "https://rss.whooshkaa.com/rss/podcast/id/1308" },
      { title: "Wisden", url: "https://www.wisden.com/feed" },
      { title: "Wisden Cricket Weekly", url: "http://feeds.soundcloud.com/users/soundcloud:users:341034518/sounds.rss" },
    ],
  },
  {
    title: "Tennis",
    image: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=900&q=80",
    feeds: [
      { title: "BBC Tennis", url: "http://feeds.bbci.co.uk/sport/tennis/rss.xml" },
      { title: "Essential Tennis Podcast", url: "https://feed.podbean.com/essentialtennis/feed.xml" },
      { title: "Grand Slam Fantasy Tennis", url: "http://www.grandslamfantasytennis.com/feed/?x=1" },
      { title: "ATP Tour News", url: "https://www.atptour.com/en/media/rss-feed/xml-feed" },
      { title: "r/tennis", url: "https://www.reddit.com/r/tennis/.rss" },
      { title: "peRFect Tennis", url: "https://www.perfect-tennis.com/feed/" },
      { title: "ESPN Tennis", url: "https://www.espn.com/espn/rss/tennis/news" },
    ],
  },
  {
    title: "Formula 1",
    image: "https://images.unsplash.com/photo-1504707748692-419802cf939d?w=900&q=80",
    feeds: [
      { title: "r/formula1", url: "https://www.reddit.com/r/formula1/.rss" },
    ],
  },
  // =====================================================
  // ENTERTAINMENT & MEDIA
  // =====================================================
  {
    title: "Movies",
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=900&q=80",
    feeds: [
      { title: "/Film", url: "https://feeds2.feedburner.com/slashfilm" },
      { title: "Ain't It Cool News", url: "https://www.aintitcool.com/node/feed/" },
      { title: "ComingSoon.net", url: "https://www.comingsoon.net/feed" },
      { title: "Deadline", url: "https://deadline.com/feed/" },
      { title: "Film School Rejects", url: "https://filmschoolrejects.com/feed/" },
      { title: "FirstShowing", url: "https://www.firstshowing.net/feed/" },
      { title: "IndieWire", url: "https://www.indiewire.com/feed" },
      { title: "r/movies", url: "https://reddit.com/r/movies/.rss" },
      { title: "Bleeding Cool Movies", url: "https://www.bleedingcool.com/movies/feed/" },
      { title: "AV Club Film", url: "https://film.avclub.com/rss" },
      { title: "Variety", url: "https://variety.com/feed/" },
    ],
  },
  {
    title: "Television",
    image: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=900&q=80",
    feeds: [
      { title: "Bleeding Cool TV", url: "https://www.bleedingcool.com/tv/feed/" },
      { title: "TV Fanatic", url: "https://www.tvfanatic.com/rss.xml" },
      { title: "TVLine", url: "https://tvline.com/feed/" },
      { title: "r/television", url: "https://reddit.com/r/television/.rss" },
      { title: "AV Club TV", url: "https://tv.avclub.com/rss" },
      { title: "The TV Addict", url: "http://feeds.feedburner.com/thetvaddict/AXob" },
    ],
  },
  {
    title: "Music",
    image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=900&q=80",
    feeds: [
      { title: "Billboard", url: "https://www.billboard.com/articles/rss.xml" },
      { title: "Consequence", url: "http://consequenceofsound.net/feed" },
      { title: "EDM.com", url: "https://edm.com/.rss/full/" },
      { title: "Metal Injection", url: "http://feeds.feedburner.com/metalinjection" },
      { title: "Music Business Worldwide", url: "https://www.musicbusinessworldwide.com/feed/" },
      { title: "Pitchfork News", url: "http://pitchfork.com/rss/news" },
      { title: "Song Exploder", url: "http://songexploder.net/feed" },
      { title: "Your EDM", url: "https://www.youredm.com/feed" },
    ],
  },
  {
    title: "Gaming",
    image: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=900&q=80",
    feeds: [
      { title: "Escapist Magazine", url: "https://www.escapistmagazine.com/v2/feed/" },
      { title: "Eurogamer", url: "https://www.eurogamer.net/?format=rss" },
      { title: "Gamasutra News", url: "http://feeds.feedburner.com/GamasutraNews" },
      { title: "GameSpot", url: "https://www.gamespot.com/feeds/mashup/" },
      { title: "IGN All", url: "http://feeds.ign.com/ign/all" },
      { title: "Indie Games Plus", url: "https://indiegamesplus.com/feed" },
      { title: "Kotaku", url: "https://kotaku.com/rss" },
      { title: "PlayStation Blog", url: "http://feeds.feedburner.com/psblog" },
      { title: "Polygon", url: "https://www.polygon.com/rss/index.xml" },
      { title: "Rock Paper Shotgun", url: "http://feeds.feedburner.com/RockPaperShotgun" },
      { title: "Steam News", url: "https://store.steampowered.com/feeds/news.xml" },
      { title: "Ancient Gaming Noob", url: "http://feeds.feedburner.com/TheAncientGamingNoob" },
      { title: "TouchArcade", url: "https://toucharcade.com/community/forums/-/index.rss" },
      { title: "Major Nelson", url: "https://majornelson.com/feed/" },
      { title: "r/gaming", url: "https://www.reddit.com/r/gaming.rss" },
    ],
  },
  {
    title: "Fun & Comics",
    image: "https://images.unsplash.com/photo-1588497859490-85d1c17db96d?w=900&q=80",
    feeds: [
      { title: "Awkward Family Photos", url: "https://awkwardfamilyphotos.com/feed/" },
      { title: "Cracked", url: "http://feeds.feedburner.com/CrackedRSS" },
      { title: "Explosm (Cyanide & Happiness)", url: "http://feeds.feedburner.com/Explosm" },
      { title: "FAIL Blog", url: "http://feeds.feedburner.com/failblog" },
      { title: "I Can Has Cheezburger", url: "http://feeds.feedburner.com/icanhascheezburger" },
      { title: "PHD Comics", url: "http://phdcomics.com/gradfeed.php" },
      { title: "Penny Arcade", url: "https://www.penny-arcade.com/feed" },
      { title: "PostSecret", url: "https://postsecret.com/feed/?alt=rss" },
      { title: "SMBC Comics", url: "https://www.smbc-comics.com/comic/rss" },
      { title: "The Bloggess", url: "https://thebloggess.com/feed/" },
      { title: "The Daily WTF", url: "http://syndication.thedailywtf.com/TheDailyWtf" },
      { title: "The Oatmeal", url: "http://feeds.feedburner.com/oatmealfeed" },
      { title: "The Onion", url: "https://www.theonion.com/rss" },
      { title: "xkcd", url: "https://xkcd.com/rss.xml" },
    ],
  },
  // =====================================================
  // LIFESTYLE & INTERESTS
  // =====================================================
  {
    title: "Food",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&q=80",
    feeds: [
      { title: "101 Cookbooks", url: "https://www.101cookbooks.com/feed" },
      { title: "Chocolate & Zucchini", url: "https://cnz.to/feed/" },
      { title: "David Lebovitz", url: "https://www.davidlebovitz.com/feed/" },
      { title: "Food52", url: "http://feeds.feedburner.com/food52-TheAandMBlog" },
      { title: "Green Kitchen Stories", url: "https://greenkitchenstories.com/feed/" },
      { title: "How Sweet Eats", url: "https://www.howsweeteats.com/feed/" },
      { title: "Joy the Baker", url: "http://joythebaker.com/feed/" },
      { title: "Kitchn", url: "https://www.thekitchn.com/main.rss" },
      { title: "Love and Olive Oil", url: "https://www.loveandoliveoil.com/feed" },
      { title: "NYT Dining & Wine", url: "https://rss.nytimes.com/services/xml/rss/nyt/DiningandWine.xml" },
      { title: "Oh She Glows", url: "https://ohsheglows.com/feed/" },
      { title: "Serious Eats Recipes", url: "http://feeds.feedburner.com/seriouseats/recipes" },
      { title: "Shutterbean", url: "http://www.shutterbean.com/feed/" },
      { title: "Skinnytaste", url: "https://www.skinnytaste.com/feed/" },
      { title: "Sprouted Kitchen", url: "https://www.sproutedkitchen.com/home?format=rss" },
      { title: "Williams-Sonoma Taste", url: "https://blog.williams-sonoma.com/feed/" },
      { title: "Smitten Kitchen", url: "http://feeds.feedburner.com/smittenkitchen" },
    ],
  },
  {
    title: "Travel",
    image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=900&q=80",
    feeds: [
      { title: "Atlas Obscura", url: "https://www.atlasobscura.com/feeds/latest" },
      { title: "Live Life Travel", url: "https://www.livelifetravel.world/feed/" },
      { title: "Lonely Planet News", url: "https://www.lonelyplanet.com/news/feed/atom/" },
      { title: "NYT Travel", url: "https://rss.nytimes.com/services/xml/rss/nyt/Travel.xml" },
      { title: "Nomadic Matt", url: "https://www.nomadicmatt.com/travel-blog/feed/" },
      { title: "The Guardian Travel", url: "https://www.theguardian.com/uk/travel/rss" },
    ],
  },
  {
    title: "Photography",
    image: "https://images.unsplash.com/photo-1502982720700-bfff97f2ecac?w=900&q=80",
    feeds: [
      { title: "500px ISO", url: "https://iso.500px.com/feed/" },
      { title: "500px Editors", url: "https://500px.com/editors.rss" },
      { title: "Boston Globe Big Picture", url: "https://www.bostonglobe.com/rss/bigpicture" },
      { title: "Canon Rumors", url: "https://www.canonrumors.com/feed/" },
      { title: "Digital Photography School", url: "https://feeds.feedburner.com/DigitalPhotographySchool" },
      { title: "Light Stalking", url: "https://www.lightstalking.com/feed/" },
      { title: "Lightroom Killer Tips", url: "https://lightroomkillertips.com/feed/" },
      { title: "One Big Photo", url: "http://feeds.feedburner.com/OneBigPhoto" },
      { title: "PetaPixel", url: "https://petapixel.com/feed/" },
      { title: "Strobist", url: "http://feeds.feedburner.com/blogspot/WOBq" },
      { title: "Stuck in Customs", url: "https://stuckincustoms.com/feed/" },
      { title: "The Sartorialist", url: "https://feeds.feedburner.com/TheSartorialist" },
    ],
  },
  {
    title: "Books",
    image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=900&q=80",
    feeds: [
      { title: "A Year of Reading the World", url: "https://ayearofreadingtheworld.com/feed/" },
      { title: "Aestas Book Blog", url: "https://aestasbookblog.com/feed/" },
      { title: "Book Riot", url: "https://bookriot.com/feed/" },
      { title: "Kirkus Reviews", url: "https://www.kirkusreviews.com/feeds/rss/" },
      { title: "NewInBooks", url: "https://www.newinbooks.com/feed/" },
      { title: "r/books", url: "https://reddit.com/r/books/.rss" },
      { title: "Wokeread", url: "https://wokeread.home.blog/feed/" },
    ],
  },
  {
    title: "History",
    image: "https://images.unsplash.com/photo-1604580864964-0462f5d5b1a8?w=900&q=80",
    feeds: [
      { title: "30 for 30 Podcasts", url: "https://feeds.megaphone.fm/ESP5765452710" },
      { title: "Smithsonian American History Blog", url: "https://americanhistory.si.edu/blog/feed" },
      { title: "Dan Carlin's Hardcore History", url: "https://feeds.feedburner.com/dancarlin/history?format=xml" },
      { title: "History in 28 Minutes", url: "https://www.historyisnowmagazine.com/blog?format=RSS" },
      { title: "HistoryNet", url: "http://www.historynet.com/feed" },
      { title: "Lore Podcast", url: "https://feeds.megaphone.fm/lore" },
      { title: "Revisionist History", url: "https://feeds.megaphone.fm/revisionisthistory" },
      { title: "The History Reader", url: "https://www.thehistoryreader.com/feed/" },
      { title: "Throughline (NPR)", url: "https://feeds.npr.org/510333/podcast.xml" },
      { title: "You Must Remember This", url: "https://feeds.megaphone.fm/YMRT7068253588" },
      { title: "The Memory Palace", url: "http://feeds.thememorypalace.us/thememorypalace" },
    ],
  },
  {
    title: "Fashion",
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=900&q=80",
    feeds: [
      { title: "ELLE Fashion", url: "https://www.elle.com/rss/fashion.xml/" },
      { title: "The Guardian Fashion", url: "https://www.theguardian.com/fashion/rss" },
      { title: "Fashion Lady", url: "https://www.fashionlady.in/category/fashion/feed" },
      { title: "FashionBeans", url: "https://www.fashionbeans.com/rss-feed/?category=fashion" },
      { title: "Fashionista", url: "https://fashionista.com/.rss/excerpt/" },
      { title: "NYT Fashion & Style", url: "https://rss.nytimes.com/services/xml/rss/nyt/FashionandStyle.xml" },
      { title: "POPSUGAR Fashion", url: "https://www.popsugar.com/fashion/feed" },
      { title: "Refinery29 Fashion", url: "https://www.refinery29.com/fashion/rss.xml" },
      { title: "YesStyle Blog", url: "https://www.yesstyle.com/blog/category/trend-and-style/feed/" },
      { title: "Who What Wear", url: "https://www.whowhatwear.com/rss" },
    ],
  },
  {
    title: "Beauty",
    image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=900&q=80",
    feeds: [
      { title: "ELLE Beauty", url: "https://www.elle.com/rss/beauty.xml/" },
      { title: "Fashionista Beauty", url: "https://fashionista.com/.rss/excerpt/beauty" },
      { title: "Fashion Lady Beauty", url: "https://www.fashionlady.in/category/beauty-tips/feed" },
      { title: "The Beauty Brains", url: "https://thebeautybrains.com/blog/feed/" },
      { title: "DORÉ", url: "https://www.wearedore.com/feed" },
      { title: "From Head To Toe", url: "http://feeds.feedburner.com/frmheadtotoe" },
      { title: "Into The Gloss", url: "https://feeds.feedburner.com/intothegloss/oqoU" },
      { title: "POPSUGAR Beauty", url: "https://www.popsugar.com/beauty/feed" },
      { title: "Refinery29 Beauty", url: "https://www.refinery29.com/beauty/rss.xml" },
      { title: "YesStyle Beauty", url: "https://www.yesstyle.com/blog/category/the-beauty-blog/feed/" },
      { title: "The Beauty Look Book", url: "https://thebeautylookbook.com/feed" },
      { title: "Makeup and Beauty Blog", url: "https://www.makeupandbeautyblog.com/feed/" },
    ],
  },
  {
    title: "Architecture",
    image: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=900&q=80",
    feeds: [
      { title: "A Daily Dose of Architecture", url: "http://feeds.feedburner.com/archidose" },
      { title: "ArchDaily", url: "http://feeds.feedburner.com/Archdaily" },
      { title: "Archinect News", url: "https://archinect.com/feed/1/news" },
      { title: "Architectural Digest", url: "https://www.architecturaldigest.com/feed/rss" },
      { title: "r/Architecture", url: "https://www.reddit.com/r/architecture/.rss" },
      { title: "Dezeen Architecture", url: "https://www.dezeen.com/architecture/feed/" },
      { title: "Contemporist", url: "https://www.contemporist.com/feed/" },
      { title: "Inhabitat Architecture", url: "https://inhabitat.com/architecture/feed/" },
      { title: "Design Milk Architecture", url: "https://design-milk.com/category/architecture/feed/" },
      { title: "Architizer Journal", url: "https://architizer.wpengine.com/feed/" },
      { title: "The Architect's Newspaper", url: "https://archpaper.com/feed" },
      { title: "designboom Architecture", url: "https://www.designboom.com/architecture/feed/" },
    ],
  },
  {
    title: "Interior Design",
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=900&q=80",
    feeds: [
      { title: "Apartment Therapy", url: "https://www.apartmenttherapy.com/design.rss" },
      { title: "Better Living Through Design", url: "http://www.betterlivingthroughdesign.com/feed/" },
      { title: "decor8", url: "https://www.decor8blog.com/blog?format=rss" },
      { title: "Core77", url: "http://feeds.feedburner.com/core77/blog" },
      { title: "Design Milk Interior", url: "https://design-milk.com/category/interior-design/feed/" },
      { title: "Fubiz Media", url: "http://feeds.feedburner.com/fubiz" },
      { title: "Ideal Home", url: "https://www.idealhome.co.uk/feed" },
      { title: "In My Own Style", url: "https://inmyownstyle.com/feed" },
      { title: "Inhabitat Design", url: "https://inhabitat.com/design/feed/" },
      { title: "r/InteriorDesign", url: "https://www.reddit.com/r/InteriorDesign/.rss" },
      { title: "Home Designing", url: "http://www.home-designing.com/feed" },
      { title: "Interior Design Latest", url: "https://www.interiordesign.net/rss/" },
      { title: "Dezeen Interiors", url: "https://www.dezeen.com/interiors/feed/" },
      { title: "Liz Marie Blog", url: "https://www.lizmarieblog.com/feed/" },
      { title: "The Design Files", url: "https://thedesignfiles.net/feed/" },
      { title: "The Inspired Room", url: "https://theinspiredroom.net/feed/" },
      { title: "Thrifty Decor Chick", url: "http://feeds.feedburner.com/blogspot/ZBcZ" },
      { title: "Trendir", url: "https://www.trendir.com/feed/" },
      { title: "Yanko Design", url: "http://feeds.feedburner.com/yankodesign" },
      { title: "Yatzer", url: "https://www.yatzer.com/rss.xml" },
      { title: "Young House Love", url: "https://www.younghouselove.com/feed/" },
      { title: "decoist", url: "https://www.decoist.com/feed/" },
      { title: "designboom Design", url: "https://www.designboom.com/design/feed" },
      { title: "sfgirlbybay", url: "https://www.sfgirlbybay.com/feed/" },
    ],
  },
  {
    title: "DIY",
    image: "https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=900&q=80",
    feeds: [
      { title: "A Beautiful Mess", url: "https://abeautifulmess.com/feed" },
      { title: "Apartment Therapy Projects", url: "https://www.apartmenttherapy.com/projects.rss" },
      { title: "Hackaday Blog", url: "https://hackaday.com/blog/feed/" },
      { title: "Centsational Style", url: "https://centsationalstyle.com/feed/" },
      { title: "DoItYourself.com", url: "https://www.doityourself.com/feed" },
      { title: "Etsy Journal", url: "https://blog.etsy.com/en/feed/" },
      { title: "How-To Geek", url: "https://www.howtogeek.com/feed/" },
      { title: "IKEA Hackers", url: "https://www.ikeahackers.net/feed" },
      { title: "MakeUseOf", url: "https://www.makeuseof.com/feed/" },
      { title: "Oh Happy Day", url: "http://ohhappyday.com/feed/" },
      { title: "WonderHowTo", url: "https://www.wonderhowto.com/rss.xml" },
    ],
  },
  {
    title: "Automotive",
    image: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=900&q=80",
    feeds: [
      { title: "Autoblog", url: "https://www.autoblog.com/rss.xml" },
      { title: "Autocar India Bikes", url: "https://www.autocarindia.com/RSS/rss.ashx?type=all_bikes" },
      { title: "Autocar India Cars", url: "https://www.autocarindia.com/RSS/rss.ashx?type=all_cars" },
      { title: "Autocar India News", url: "https://www.autocarindia.com/RSS/rss.ashx?type=News" },
      { title: "Autocar UK", url: "https://www.autocar.co.uk/rss" },
      { title: "BMW Blog", url: "https://feeds.feedburner.com/BmwBlog" },
      { title: "Bike EXIF", url: "https://www.bikeexif.com/feed" },
      { title: "Car Body Design", url: "https://www.carbodydesign.com/feed/" },
      { title: "Carscoops", url: "https://www.carscoops.com/feed/" },
      { title: "r/formula1", url: "https://www.reddit.com/r/formula1/.rss" },
      { title: "Jalopnik", url: "https://jalopnik.com/rss" },
      { title: "Car and Driver", url: "https://www.caranddriver.com/rss/all.xml/" },
      { title: "Petrolicious", url: "https://petrolicious.com/feed" },
      { title: "Automotive News", url: "http://feeds.feedburner.com/autonews/AutomakerNews" },
      { title: "Automotive News Editors", url: "http://feeds.feedburner.com/autonews/EditorsPicks" },
      { title: "Speedhunters", url: "http://feeds.feedburner.com/speedhunters" },
      { title: "The Truth About Cars", url: "https://www.thetruthaboutcars.com/feed/" },
      { title: "Bring a Trailer", url: "https://bringatrailer.com/feed/" },
    ],
  },
  {
    title: "Healthcare",
    image: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=900&q=80",
    feeds: [
      { title: "The Health Care Blog", url: "https://thehealthcareblog.com/blog/feed/" },
      { title: "STAT News", url: "https://www.statnews.com/feed/" },
      { title: "KFF Health News", url: "https://kffhealthnews.org/feed/" },
    ],
  },
  {
    title: "Energy",
    image: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=900&q=80",
    feeds: [
      { title: "CleanTechnica", url: "https://cleantechnica.com/feed/" },
      { title: "Greentech Media", url: "https://www.greentechmedia.com/feed" },
      { title: "Energy.gov", url: "https://www.energy.gov/rss.xml" },
    ],
  },
  {
    title: "Biopharma",
    image: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=900&q=80",
    feeds: [
      { title: "Science Magazine", url: "https://www.sciencemag.org/rss/news_current.xml" },
      { title: "Nature Biotech", url: "https://www.nature.com/subjects/biotech.rss" },
      { title: "Fierce Biotech", url: "https://www.fiercebiotech.com/rss" },
    ],
  },
  // =====================================================
  // DESIGN
  // =====================================================
  {
    title: "UI / UX",
    image: "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=900&q=80",
    feeds: [
      { title: "Smashing Magazine", url: "https://www.smashingmagazine.com/feed" },
      { title: "Boxes and Arrows", url: "http://boxesandarrows.com/rss/" },
      { title: "Designer News", url: "https://www.designernews.co/?format=rss" },
      { title: "InVision Inside Design", url: "https://www.invisionapp.com/inside-design/feed" },
      { title: "JUST Creative", url: "https://feeds.feedburner.com/JustCreativeDesignBlog" },
      { title: "NN/g Articles", url: "https://www.nngroup.com/feed/rss/" },
      { title: "UX Studio Blog", url: "https://uxstudioteam.com/ux-blog/feed/" },
      { title: "UX Collective", url: "https://uxdesign.cc/feed" },
      { title: "UX Movement", url: "https://uxmovement.com/feed/" },
      { title: "Usability Geek", url: "https://usabilitygeek.com/feed/" },
      { title: "r/userexperience", url: "https://www.reddit.com/r/userexperience/.rss" },
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
      { title: "r/iPhone", url: "https://www.reddit.com/r/iphone/.rss" },
      { title: "r/gaming", url: "https://www.reddit.com/r/gaming.rss" },
      { title: "r/movies", url: "https://reddit.com/r/movies/.rss" },
      { title: "r/television", url: "https://reddit.com/r/television/.rss" },
      { title: "r/books", url: "https://reddit.com/r/books/.rss" },
      { title: "r/sports", url: "https://www.reddit.com/r/sports.rss" },
      { title: "r/space", url: "https://www.reddit.com/r/space/.rss?format=xml" },
      { title: "r/personalfinance", url: "https://reddit.com/r/personalfinance/.rss" },
      { title: "r/formula1", url: "https://www.reddit.com/r/formula1/.rss" },
      { title: "r/Cricket", url: "https://www.reddit.com/r/Cricket/.rss" },
      { title: "r/tennis", url: "https://www.reddit.com/r/tennis/.rss" },
      { title: "r/football", url: "https://www.reddit.com/r/football/.rss?format=xml" },
      { title: "r/architecture", url: "https://www.reddit.com/r/architecture/.rss" },
      { title: "r/InteriorDesign", url: "https://www.reddit.com/r/InteriorDesign/.rss" },
      { title: "r/userexperience", url: "https://www.reddit.com/r/userexperience/.rss" },
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
  const [searchUrl, setSearchUrl] = useState("");
  const [searchResults, setSearchResults] = useState<FeedRef[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [addTarget, setAddTarget] = useState<FeedRef | null>(null);
  const [folderChoice, setFolderChoice] = useState<string>("");
  const [newFolderName, setNewFolderName] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState("");

  const existingUrls = useMemo(() => {
    const urls = new Set<string>();
    folders.forEach((folder) => {
      folder.feeds?.forEach((feed) => {
        if (feed.url) urls.add(feed.url);
      });
    });
    return urls;
  }, [folders]);

  const categories = useMemo(() => {
    const normalizeKey = (value: string) => value.trim().toLowerCase();
    const mergeFeeds = (primary: FeedRef[], secondary: FeedRef[]) => {
      const seen = new Set<string>();
      const merged: FeedRef[] = [];
      const add = (feed: FeedRef) => {
        const key = feed.url.trim().toLowerCase();
        if (!key || seen.has(key)) return;
        seen.add(key);
        merged.push(feed);
      };
      primary.forEach(add);
      secondary.forEach(add);
      return merged;
    };

    const map = new Map<string, CategoryCard>();
    BASE_CATEGORIES.forEach((category) => {
      map.set(normalizeKey(category.title), {
        ...category,
        feeds: [...category.feeds],
      });
    });

    folders.forEach((folder) => {
      const title = folder.name?.trim();
      if (!title) return;
      const key = normalizeKey(title);
      const folderFeeds =
        folder.feeds?.map((feed) => ({
          title: feed.title || feed.url,
          url: feed.url,
        })) ?? [];
      const existing = map.get(key);
      if (existing) {
        existing.feeds = mergeFeeds(folderFeeds, existing.feeds);
      } else {
        map.set(key, { title, image: FALLBACK_CATEGORY_IMAGE, feeds: folderFeeds });
      }
    });

    const ordered: CategoryCard[] = [];
    const seenKeys = new Set<string>();
    folders.forEach((folder) => {
      const key = normalizeKey(folder.name || "");
      const category = map.get(key);
      if (category && !seenKeys.has(key)) {
        ordered.push(category);
        seenKeys.add(key);
      }
    });
    BASE_CATEGORIES.forEach((category) => {
      const key = normalizeKey(category.title);
      const resolved = map.get(key) || category;
      if (!seenKeys.has(key)) {
        ordered.push(resolved);
        seenKeys.add(key);
      }
    });
    map.forEach((category, key) => {
      if (!seenKeys.has(key)) {
        ordered.push(category);
        seenKeys.add(key);
      }
    });
    return ordered;
  }, [folders]);

  const handleResolve = async () => {
    if (!searchUrl.trim()) return;
    setSearching(true);
    setSearchError("");
    try {
      const res = await resolveDiscover(searchUrl.trim());
      const filtered = res.feeds.filter((f) => !existingUrls.has(f.url));
      setSearchResults(filtered);
      if (filtered.length > 0) {
        info("feed", "Feeds discovered", `Found ${filtered.length} feed${filtered.length > 1 ? "s" : ""}`);
      } else if (res.feeds.length > 0) {
        info("feed", "Already subscribed", "All discovered feeds are already in your library");
      }
    } catch (err) {
      setSearchError("Unable to resolve that URL. Please try another.");
      logError("feed", "Feed discovery failed", extractErrorMessage(err));
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (!addTarget) return;
    if (folders.length > 0) {
      setFolderChoice(String(folders[0].id));
    } else {
      setFolderChoice("new");
    }
    setNewFolderName("");
    setAddError("");
  }, [addTarget, folders]);

  const handleAdd = async () => {
    if (!addTarget) return;
    setAddError("");
    const creatingNew = folderChoice === "new";
    const name = newFolderName.trim();
    if (creatingNew && !name) {
      setAddError("Folder name is required.");
      return;
    }
    setAdding(true);
    try {
      let folderId: number | null = null;
      let folderName = "";
      if (creatingNew) {
        const folder = await onCreateFolder(name);
        folderId = folder.id;
        folderName = name;
        success("folder", "Folder created", `Created folder "${name}"`);
      } else {
        const selected = folders.find((f) => String(f.id) === folderChoice);
        if (!selected) {
          setAddError("Please choose a folder.");
          return;
        }
        folderId = selected.id;
        folderName = selected.name;
      }
      await onAddFeed(folderId, addTarget.url);
      success("feed", "Feed added", `Added "${addTarget.title}" to ${folderName}`);
      setAddTarget(null);
    } catch (err) {
      setAddError("Unable to add feed. Try again.");
      logError("feed", "Failed to add feed", extractErrorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  const maybeAdd = (feed: FeedRef) => {
    if (existingUrls.has(feed.url)) return;
    setAddTarget(feed);
  };

  const activeFeeds = useMemo(() => {
    if (!activeCategory) return [];
    const match = categories.find((c) => c.title === activeCategory);
    const list = match ? match.feeds : [];
    if (!categorySearch.trim()) return list;
    const needle = categorySearch.toLowerCase();
    return list.filter((feed) => `${feed.title} ${feed.url}`.toLowerCase().includes(needle));
  }, [activeCategory, categories, categorySearch]);

  return (
    <>
    <div className="discover-panel space-y-4">
      <div className="mb-6">
        <h2 className="section-title">Follow Sources</h2>
      </div>
      <div className="mb-4 flex items-center gap-6 border-b border-gray-200 text-sm dark:border-gray-800">
        {[
          { key: "websites", label: "Websites" },
          { key: "reddit", label: "Reddit" },
          { key: "newsletters", label: "Newsletters" },
          { key: "google", label: "Google News" },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`pb-2 ${activeTab === tab.key ? "border-b-2 border-current text-accent" : "text-gray-500"}`}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab !== "websites" && <p className="text-muted">Coming soon.</p>}
      {activeTab === "websites" && (
        <>
          {!activeCategory && (
            <>
              <div className="mb-6 flex items-center gap-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2 text-sm shadow-sm">
                <span className="text-gray-400">⌕</span>
                <input
                  className="w-full bg-transparent text-sm outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
                  placeholder="Search by topic, website, or RSS link"
                  value={searchUrl}
                  onChange={(e) => setSearchUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleResolve()}
                />
                <select className="bg-transparent text-xs text-gray-500 outline-none">
                  <option>English</option>
                </select>
                <Button size="sm" onClick={handleResolve} loading={searching} className="ml-2 rounded-full">
                  Search
                </Button>
              </div>
              {searchError && <p className="mt-2 text-xs text-red-600">{searchError}</p>}
              {searchResults.length > 0 && (
                <div className="mb-8 space-y-3">
                  {searchResults.map((f) => (
                    <FeedSuggestion key={f.url} feed={f} added={existingUrls.has(f.url)} onAdd={() => maybeAdd(f)} />
                  ))}
                </div>
              )}
              <div className="mb-6 grid auto-rows-[140px] grid-cols-2 gap-3 grid-flow-dense md:auto-rows-[160px] md:grid-cols-4">
                {categories.map((card, index) => {
                  const followingCount = card.feeds.filter((f) => existingUrls.has(f.url)).length;
                  const totalCount = card.feeds.length;
                  
                  // Varied bento pattern using multiple cycles for organic feel
                  // Cycle A (0-5): Large at start, wide in middle
                  // Cycle B (6-11): Small start, large in middle, wide at end
                  // Cycle C (12-17): Wide start, smalls, large at end
                  const cycleIndex = Math.floor(index / 6) % 3;
                  const posInCycle = index % 6;
                  
                  let isLarge = false;
                  let isWide = false;
                  
                  if (cycleIndex === 0) {
                    // Cycle A: [LARGE] [small] [small] [WIDE] [small] [small]
                    isLarge = posInCycle === 0;
                    isWide = posInCycle === 3;
                  } else if (cycleIndex === 1) {
                    // Cycle B: [small] [small] [LARGE] [small] [WIDE] [small]
                    isLarge = posInCycle === 2;
                    isWide = posInCycle === 4;
                  } else {
                    // Cycle C: [WIDE] [small] [small] [small] [LARGE] [small]
                    isLarge = posInCycle === 4;
                    isWide = posInCycle === 0;
                  }
                  
                  const sizeClasses = isLarge
                    ? "col-span-2 row-span-2"
                    : isWide
                    ? "col-span-2"
                    : "";
                  
                  return (
                    <button
                      key={card.title}
                      className={`group relative overflow-hidden rounded-2xl text-left shadow-sm transition-transform hover:scale-[1.02] hover:shadow-lg ${sizeClasses}`}
                      onClick={() => {
                        setActiveCategory(card.title);
                        setCategorySearch("");
                      }}
                    >
                      <img src={card.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute inset-0 flex flex-col justify-between p-4">
                        <div className="flex items-start justify-between">
                          <span className={`font-semibold text-white drop-shadow ${isLarge ? "text-lg md:text-xl" : "text-sm"}`}>
                            {card.title}
                          </span>
                          <span className={`rounded-full bg-white/90 font-semibold text-gray-900 ${isLarge ? "px-3 py-1.5 text-sm" : "px-2 py-1 text-xs"}`}>
                            +
                          </span>
                        </div>
                        <div className={`text-white/90 drop-shadow ${isLarge ? "text-sm" : "text-xs"}`}>
                          {followingCount > 0 ? (
                            <span>Following {followingCount}/{totalCount} feeds</span>
                          ) : (
                            <span>{totalCount} feeds available</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {activeCategory && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="page-subtitle">Category</p>
                  <div className="flex items-center gap-2">
                    <button className="btn-ghost" onClick={() => setActiveCategory(null)} aria-label="Back to categories">
                      ←
                    </button>
                    <h3 className="section-title">{activeCategory}</h3>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2 text-sm shadow-sm">
                <span className="text-gray-400">⌕</span>
                <input
                  className="w-full bg-transparent text-sm outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
                  placeholder={`Search ${activeCategory} feeds`}
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                />
                <span className="text-xs text-gray-400">{activeFeeds.length} feeds</span>
              </div>
              <div className="space-y-4">
                {activeFeeds.map((feed) => (
                  <CategoryFeedCard key={feed.url} feed={feed} added={existingUrls.has(feed.url)} onAdd={() => maybeAdd(feed)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>

    <BaseModal 
      open={Boolean(addTarget)} 
      onClose={() => setAddTarget(null)} 
      maxWidthClass="max-w-[480px]"
      title="Add feed"
    >
      <div className="discover-add-modal p-6 pt-0">
        <p className="text-muted">{addTarget?.title}</p>
        <div className="mt-4 space-y-3">
          <FormGroup label="Save to">
            <Select
              value={folderChoice}
              onChange={(e) => setFolderChoice(e.target.value)}
            >
              {folders.map((f) => (
                <option key={f.id} value={String(f.id)}>
                  {f.name}
                </option>
              ))}
              <option value="new">+ New folder</option>
            </Select>
          </FormGroup>
          {folderChoice === "new" && (
            <FormGroup label="Folder name">
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
              />
            </FormGroup>
          )}
          {addError && <p className="text-xs text-red-600">{addError}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setAddTarget(null)}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            loading={adding}
            disabled={folderChoice === "new" && !newFolderName.trim()}
          >
            Add
          </Button>
        </div>
      </div>
    </BaseModal>
    </>
  );
}

function FeedSuggestion({ feed, onAdd, added }: { feed: FeedRef; onAdd: () => void; added: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[var(--surface-border)] bg-[var(--surface)]/70 px-3 py-3 shadow-sm">
      <div>
        <p className="font-medium">{feed.title}</p>
        <p className="text-xs text-gray-500">{feed.url}</p>
      </div>
      <Button size="sm" onClick={onAdd} disabled={added} className="rounded-full">
        {added ? "Added" : "Add"}
      </Button>
    </div>
  );
}

function CategoryFeedCard({ feed, onAdd, added }: { feed: FeedRef; onAdd: () => void; added: boolean }) {
  const domain = (() => {
    try {
      return new URL(feed.url).hostname.replace("www.", "");
    } catch {
      return feed.url;
    }
  })();
  return (
    <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
            className="h-10 w-10 rounded"
            alt=""
          />
          <div>
            <p className="font-semibold">{feed.title}</p>
            <p className="text-muted">{domain}</p>
          </div>
        </div>
        <Button size="sm" onClick={onAdd} disabled={added} className="rounded-full">
          {added ? "Following" : "Follow"}
        </Button>
      </div>
      <p className="text-body mt-3">
        Popular source in {domain.includes("theverge") ? "tech and culture" : "this category"}.
      </p>
      <div className="text-muted mt-3">• Updated frequently • RSS</div>
    </div>
  );
}
