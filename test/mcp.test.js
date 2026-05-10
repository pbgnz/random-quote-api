const { spawn } = require('child_process');

// Helper to send JSON-RPC request to MCP server and get response
function sendMcpRequest(request) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', ['src/mcp.js'], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let responseCount = 0;
    const responses = [];

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
      const lines = stdout.split('\n');
      stdout = lines[lines.length - 1]; // Keep incomplete line

      // Check each complete line
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];
        if (!line || line.includes('injected env')) continue;

        try {
          const json = JSON.parse(line);
          if (json.jsonrpc === '2.0') {
            responses.push(json);
            responseCount++;
          }
        } catch (e) {
          // Ignore non-JSON lines (like logs)
        }
      }

      // Resolve when we have all expected responses
      if (responseCount >= (Array.isArray(request) ? request.length : 1)) {
        setTimeout(() => {
          proc.kill();
          resolve(responses);
        }, 50);
      }
    });

    proc.stderr.on('data', (data) => {
      console.error('MCP stderr:', data.toString());
    });

    proc.on('error', reject);

    // Send request(s)
    const requests = Array.isArray(request) ? request : [request];
    for (const req of requests) {
      proc.stdin.write(JSON.stringify(req) + '\n');
    }
  });
}

describe('MCP Server', () => {
  it('should respond to initialize request', async () => {
    const responses = await sendMcpRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
    });

    expect(responses).toHaveLength(1);
    const response = responses[0];
    expect(response.id).toBe(1);
    expect(response.result).toBeDefined();
    expect(response.result.serverInfo.name).toBe('random-quote-api');
    expect(response.result.serverInfo.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(response.result.protocolVersion).toBe('2024-11-05');
  });

  it('should list all available tools', async () => {
    const responses = await sendMcpRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
    });

    expect(responses).toHaveLength(1);
    const response = responses[0];
    expect(response.result.tools).toBeDefined();
    expect(response.result.tools).toHaveLength(3);

    const toolNames = response.result.tools.map((t) => t.name);
    expect(toolNames).toContain('get_random_quote');
    expect(toolNames).toContain('get_quotes');
    expect(toolNames).toContain('get_cache_stats');
  });

  it('should include descriptions for all tools', async () => {
    const responses = await sendMcpRequest({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/list',
    });

    const { tools } = responses[0].result;
    tools.forEach((tool) => {
      expect(tool.description).toBeDefined();
      expect(tool.description.length).toBeGreaterThan(0);
      expect(tool.inputSchema).toBeDefined();
    });
  });

  it('should handle tools/call for get_cache_stats', async () => {
    const responses = await sendMcpRequest({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'get_cache_stats',
        arguments: {},
      },
    });

    expect(responses).toHaveLength(1);
    const response = responses[0];
    expect(response.result.content).toBeDefined();
    expect(response.result.content).toHaveLength(1);
    expect(response.result.content[0].type).toBe('text');

    const stats = JSON.parse(response.result.content[0].text);
    expect(stats.hits).toBeGreaterThanOrEqual(0);
    expect(stats.misses).toBeGreaterThanOrEqual(0);
    expect(stats.expirations).toBeGreaterThanOrEqual(0);
    expect(stats.hitRate).toBeDefined();
  });

  it('should handle tools/call for get_random_quote', async () => {
    const responses = await sendMcpRequest({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'get_random_quote',
        arguments: {},
      },
    });

    expect(responses).toHaveLength(1);
    const response = responses[0];
    expect(response.result.content).toBeDefined();
    expect(response.result.content).toHaveLength(1);

    const quote = JSON.parse(response.result.content[0].text);
    expect(quote.id).toBeDefined();
    expect(quote.quote).toBeDefined();
    expect(quote.author).toBeDefined();
  });

  it('should handle tools/call for get_quotes', async () => {
    const responses = await sendMcpRequest({
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'get_quotes',
        arguments: { count: 3 },
      },
    });

    expect(responses).toHaveLength(1);
    const response = responses[0];
    const quotes = JSON.parse(response.result.content[0].text);
    expect(Array.isArray(quotes)).toBe(true);
    expect(quotes.length).toBeLessThanOrEqual(3);
    quotes.forEach((q) => {
      expect(q.id).toBeDefined();
      expect(q.quote).toBeDefined();
      expect(q.author).toBeDefined();
    });
  });

  it('should return error for unknown tool', async () => {
    const responses = await sendMcpRequest({
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: {
        name: 'nonexistent_tool',
        arguments: {},
      },
    });

    expect(responses).toHaveLength(1);
    const response = responses[0];
    expect(response.error).toBeDefined();
    expect(response.error.code).toBe(-32601);
    expect(response.error.message).toContain('Unknown tool');
  });

  it('should return error for unknown method', async () => {
    const responses = await sendMcpRequest({
      jsonrpc: '2.0',
      id: 8,
      method: 'unknown/method',
    });

    expect(responses).toHaveLength(1);
    const response = responses[0];
    expect(response.error).toBeDefined();
    expect(response.error.code).toBe(-32601);
    expect(response.error.message).toContain('Unknown method');
  });

  it('should validate tool input schema', async () => {
    const responses = await sendMcpRequest({
      jsonrpc: '2.0',
      id: 9,
      method: 'tools/list',
    });

    const { tools } = responses[0].result;
    const getQuotesTool = tools.find((t) => t.name === 'get_quotes');

    expect(getQuotesTool.inputSchema.properties.count).toBeDefined();
    expect(getQuotesTool.inputSchema.properties.count.type).toBe('integer');
    expect(getQuotesTool.inputSchema.properties.count.minimum).toBe(1);
    expect(getQuotesTool.inputSchema.properties.count.maximum).toBe(30);
  });

  it('should handle multiple sequential requests', async () => {
    const requests = [
      { jsonrpc: '2.0', id: 10, method: 'initialize' },
      { jsonrpc: '2.0', id: 11, method: 'tools/list' },
      {
        jsonrpc: '2.0',
        id: 12,
        method: 'tools/call',
        params: { name: 'get_cache_stats', arguments: {} },
      },
    ];

    const responses = await sendMcpRequest(requests);
    expect(responses).toHaveLength(3);
    expect(responses[0].id).toBe(10);
    expect(responses[1].id).toBe(11);
    expect(responses[2].id).toBe(12);
  });
});
