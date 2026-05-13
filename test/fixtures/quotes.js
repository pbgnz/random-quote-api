// Mock quote data for testing
const fixturesByPage = {
  1: [
    { id: 0, quote: "The only way to do great work is to love what you do.", author: "Steve Jobs", bookTitle: null, tags: ["work", "inspiration"] },
    { id: 1, quote: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs", bookTitle: null, tags: ["innovation", "leadership"] },
    { id: 2, quote: "Life is what happens when you're busy making other plans.", author: "John Lennon", bookTitle: "Beautiful Boy", tags: ["life"] },
    { id: 3, quote: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt", bookTitle: null, tags: ["dreams", "future"] },
    { id: 4, quote: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle", bookTitle: null, tags: [] },
  ],
  2: [
    { id: 30, quote: "The way to get started is to quit talking and begin doing.", author: "Walt Disney", bookTitle: null, tags: ["action", "motivation"] },
    { id: 31, quote: "Don't let yesterday take up too much of today.", author: "Will Rogers", bookTitle: null, tags: ["life"] },
    { id: 32, quote: "You learn more from failure than from success.", author: "Unknown", bookTitle: null, tags: ["failure", "learning"] },
    { id: 33, quote: "It's not whether you get knocked down, it's whether you get up.", author: "Vince Lombardi", bookTitle: null, tags: ["perseverance"] },
    { id: 34, quote: "If you are working on something that you really care about, you don't have to be pushed. The vision pulls you.", author: "Steve Jobs", bookTitle: null, tags: ["vision", "work"] },
  ],
  3: [
    { id: 60, quote: "People who are crazy enough to think they can change the world, are the ones who do.", author: "Rob Siltanen", bookTitle: null, tags: ["change"] },
    { id: 61, quote: "Failure is not an option.", author: "Gene Kranz", bookTitle: null, tags: [] },
    { id: 62, quote: "Success is not final, failure is not fatal.", author: "Winston Churchill", bookTitle: null, tags: ["success", "failure"] },
    { id: 63, quote: "Believe you can and you're halfway there.", author: "Theodore Roosevelt", bookTitle: null, tags: ["belief", "motivation"] },
    { id: 64, quote: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb", bookTitle: null, tags: ["time", "action"] },
  ],
};

// Fill remaining pages with generic quotes so any page (1-100) can be accessed
function getQuotesForPage(pageNumber) {
  if (fixturesByPage[pageNumber]) {
    return fixturesByPage[pageNumber];
  }

  // Generate consistent fixtures for other pages
  const baseId = (pageNumber - 1) * 30;
  return Array.from({ length: 5 }, (_, i) => ({
    id: baseId + i,
    quote: `Quote ${baseId + i}`,
    author: `Author ${pageNumber}`,
    bookTitle: null,
    tags: [],
  }));
}

module.exports = {
  fixturesByPage,
  getQuotesForPage
};
