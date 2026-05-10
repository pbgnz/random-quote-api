require('dotenv').config();
const readline = require('readline');
const logger = require('./utils/logger');
const QuotesCache = require('./cache/quotesCache');
const QuotesService = require('./services/quotesService');

// Initialize cache and service
const cacheTtlMinutes = parseInt(process.env.CACHE_TTL_MINUTES) || 60;
const cache = new QuotesCache(cacheTtlMinutes, logger);
const service = new QuotesService(cache, logger);

// Package version
const packageVersion = require('../package.json').version;

// Tool definitions
const tools = {
  get_random_quote: {
    description: 'Get a single random quote from Goodreads',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  get_quotes: {
    description: 'Get multiple random quotes from Goodreads',
    inputSchema: {
      type: 'object',
      properties: {
        count: {
          type: 'integer',
          description: 'Number of quotes to return (1-30)',
          minimum: 1,
          maximum: 30,
        },
      },
    },
  },
  get_cache_stats: {
    description: 'Get cache hit/miss statistics and performance metrics',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
};

// Tool handlers
const toolHandlers = {
  async get_random_quote() {
    const { quotes } = await service.getQuotes();
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(quote, null, 2),
        },
      ],
    };
  },

  async get_quotes({ count } = {}) {
    const { quotes } = await service.getQuotes({ count });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(quotes, null, 2),
        },
      ],
    };
  },

  async get_cache_stats() {
    const stats = cache.getStats();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(stats, null, 2),
        },
      ],
    };
  },
};

// JSON-RPC response helpers
function sendResponse(id, result) {
  console.log(JSON.stringify({ jsonrpc: '2.0', id, result }));
}

function sendError(id, code, message, data = null) {
  const error = { code, message };
  if (data) error.data = data;
  console.log(JSON.stringify({ jsonrpc: '2.0', id, error }));
}

// Handle JSON-RPC requests
async function handleRequest(message) {
  const { jsonrpc, id, method, params } = message;

  // Validate JSON-RPC
  if (jsonrpc !== '2.0') {
    if (id !== undefined) sendError(id, -32600, 'Invalid Request');
    return;
  }

  try {
    switch (method) {
      case 'initialize':
        sendResponse(id, {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'random-quote-api',
            version: packageVersion,
          },
        });
        break;

      case 'tools/list':
        sendResponse(id, {
          tools: Object.entries(tools).map(([name, { description, inputSchema }]) => ({
            name,
            description,
            inputSchema,
          })),
        });
        break;

      case 'tools/call': {
        const { name, arguments: args } = params || {};
        if (!name || !toolHandlers[name]) {
          sendError(id, -32601, `Unknown tool: ${name}`);
          return;
        }

        const result = await toolHandlers[name](args);
        sendResponse(id, result);
        break;
      }

      default:
        sendError(id, -32601, `Unknown method: ${method}`);
    }
  } catch (err) {
    logger.error('MCP request error', {
      method,
      error: err.message,
      stack: err.stack,
    });
    sendError(id, -32603, 'Internal error', err.message);
  }
}

// Set up stdin/stdout for JSON-RPC
const rl = readline.createInterface({
  input: process.stdin,
  output: null, // Don't echo stdin to stdout
  terminal: false,
});

rl.on('line', async (line) => {
  try {
    const message = JSON.parse(line);
    await handleRequest(message);
  } catch (err) {
    // Ignore parse errors for robustness
    logger.error('JSON parse error', { line, error: err.message });
  }
});

rl.on('close', () => {
  process.exit(0);
});

// Log startup
logger.info('MCP server started', { version: packageVersion });
