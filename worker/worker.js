/**
 * JARVIS Dashboard - Cloudflare Worker API Proxy
 * Proxies chat requests to free model providers (OpenRouter, Kilo, Nous, Inception)
 */

// ===== CONFIG =====
const MODEL_PROVIDERS = {
  // OpenRouter models
  'nvidia/nemotron-3-ultra-550b-a55b:free': { provider: 'openrouter', model: 'nvidia/nemotron-3-ultra-550b-a55b:free' },
  'google/gemma-4-31b-it:free': { provider: 'openrouter', model: 'google/gemma-4-31b-it:free' },
  'nvidaa/nemotron-3-nano-omni-30b-a3b-reasoning:free': { provider: 'openrouter', model: 'nvidaa/nemotron-3-nano-omni-30b-a3b-reasoning:free' },
  'nvidia/nemotron-3.5-super-vl:free': { provider: 'openrouter', model: 'nvidia/nemotron-3.5-super-vl:free' },
  'inclusionai/ling-3.2-flash:free': { provider: 'openrouter', model: 'inclusionai/ling-3.2-flash:free' },
  'liquid/lfm-3-1.7b:free': { provider: 'openrouter', model: 'liquid/lfm-3-1.7b:free' },
  'recursive/flint-v1.0:free': { provider: 'openrouter', model: 'recursive/flint-v1.0:free' },
  'baidu/ernie-5.5-flash-preview:free': { provider: 'openrouter', model: 'baidu/ernie-5.5-flash-preview:free' },

  // Nous models
  'tencent/hy4-flash:free': { provider: 'nous', model: 'tencent/hy4-flash:free' },
  'upstage/solar-mini4:free': { provider: 'nous', model: 'upstage/solar-mini4:free' },
  'meituan/longcat-2.5:free': { provider: 'nous', model: 'meituan/longcat-2.5:free' },
  'stepfun/step-3.7-flash:free': { provider: 'nous', model: 'stepfun/step-3.7-flash:free' },

  // Kilo router
  'kilo-auto/free': { provider: 'kilo', model: 'kilo-auto/free' },

  // Inception (mercury-3) - paid only, included for completeness
  'mercury-3': { provider: 'inception', model: 'mercury-3' },
  'mercury-2': { provider: 'inception', model: 'mercury-2' },
  'mercury-2.5': { provider: 'inception', model: 'mercury-2.5' },
};

const PROVIDER_CONFIG = {
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    keyEnv: 'OPENROUTER_API_KEY',
  },
  kilo: {
    baseUrl: 'https://ai-gateway.kilo.ai/api/v1',
    keyEnv: 'KILOCODE_API_KEY',
  },
  nous: {
    baseUrl: 'https://api.nousresearch.com/v1',
    keyEnv: 'NOUS_API_KEY',
  },
  inception: {
    baseUrl: 'https://api.inceptionlabs.ai/v1',
    keyEnv: 'INCEPTION_API_KEY',
  },
};

// ===== UTILITIES =====
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}

async function fetchWithTimeout(url, options, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

// ===== MAI: HANDLER =====
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    // Health check
    if (url.pathname === '/api/health') {
      return jsonResponse({ status: 'ok', timestamp: Date.now() });
    }

    // Models list
    if (url.pathname === '/api/models') {
      return jsonResponse({
        models: Object.entries(MODEL_PROVIDERS).map(([id, config]) => ({
          id,
          provider: config.provider,
          free: !['mercury-3', 'mercury-2', 'mercury-2.5'].includes(id),
        })),
      });
    }

    // Chat endpoint
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      return handleChat(request, env);
    }

    return errorResponse('Not found', 404);
  };
};

// ===== CHAT HANDLER =====
async function handleChat(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON');
  }

  const { model, messages, stream, temperature = 0.7, max_tokens } = body;

  if (!model || !messages || !Array.isArray(messages)) {
    return errorResponse('Missing required fields: model, messages');
  }

  const modelConfig = MODEL_PROVIDERS[model];
  if (!modelConfig) {
    return errorResponse(`Unknown model: ${model}`, 404);
  }

  const providerConfig = PROVIDER_CONFIG[modelConfig.provider];
  const apiKey = env[providerConfig.keyEnv];

  if (!apiKey) {
    return errorResponse(`Provider ${modelConfig.provider} not configured (missing ${providerConfig.keyEnv})`, 503);
  }

  // Build request to provider
  const providerRequest = {
    model: modelConfig.model,
    messages,
    temperature,
    stream: stream || false,
  };
  if (max_tokens) providerRequest.max_tokens = max_tokens;

  try {
    const response = await fetchWithTimeout(
      `${providerConfig.baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ferry737.github.io/jarvis-dashboard/',
          'X-Title': 'JARVIS Dashboard',
        },
        body: JSON.stringify(providerRequest),
      },
      60000
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Provider ${modelConfig.provider} error:`, response.status, errorText);
      return errorResponse(`Provider error: ${response.status}`, 502);
    }

    // Stream response back to client
    if (stream) {
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          ...corsHeaders(),
        },
      });
    }

    const data = await response.json();
    return jsonResponse({
      content: data.choices?.[0]?.message?.content || '',
      model: data.model,
      usage: data.usage,
    });

  } catch (error) {
    if (error.name === 'AbortError') {
      return errorResponse('Request timeout', 504);
    }
    console.error('Chat error:', error);
    return errorResponse('Internal server error', 500);
  }
}