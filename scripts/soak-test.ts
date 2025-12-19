/// <reference types="k6" />
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

// Enable/disable console logging
const ENABLE_LOGGING = true;

// Base URL for the Deck of Cards API
const BASE_URL = 'http://127.0.0.1:8000';

// Soak Test Configuration
// Purpose: Detect degradation (GC, memory leaks, resource exhaustion)
// Load: Sustained baseline load (25 VUs) for 15 minutes
export const options = {
    vus: 25,
    duration: '15m',
    thresholds: {
        'http_req_failed': ['rate<0.01'],  // Less than 1% errors
        'http_req_duration': ['p(95)<500', 'p(99)<1000'], // Performance should not degrade
        'http_reqs': ['rate>40'], // Maintain consistent throughput
    },
};

// Separate metrics for each request type
const deckLatency = new Trend('deck_operations_latency');
const drawLatency = new Trend('draw_cards_latency');

// Deck operations response
interface DeckResponse {
    success: boolean;
    deck_id: string;
    shuffled: boolean;
    remaining: number;
}

// Draw cards response
interface DrawResponse {
    success: boolean;
    deck_id: string;
    cards: Array<{
        code: string;
        image: string;
        value: string;
        suit: string;
    }>;
    remaining: number;
}

// Create or shuffle deck
function createOrShuffleDeck(url: string): string | undefined {
    if (ENABLE_LOGGING) console.log(`Making request to: ${url}`);
    const res = http.get(url);
    deckLatency.add(res.timings.duration);

    let payload: DeckResponse | null = null;
    try {
        payload = res.json() as unknown as DeckResponse;
    } catch (e) {
        console.error('Failed to parse JSON response:', e);
    }
    
    if (ENABLE_LOGGING) console.log(res.status);
    if (ENABLE_LOGGING) console.log(res.body);
    
    const passed = check(res, {
        'status is 200': (r) => r.status === 200,
        'protocol is HTTP/1.1': (r) => r.proto === 'HTTP/1.1',
        'no performance degradation': (r) => r.timings.duration < 750,
    });
    
    if (!passed) {
        console.warn(`[${new Date().toISOString()}] Performance degradation detected`);
    }
    
    if (res.status !== 200) {
        console.error(`Request failed with status ${res.status}. Stopping VU.`);
        return undefined;
    }
    
    return payload?.deck_id;
}

// Draw cards from deck
function drawCards(url: string): DrawResponse | undefined {
    if (ENABLE_LOGGING) console.log(`Making request to: ${url}`);
    const res = http.get(url);
    drawLatency.add(res.timings.duration);

    let payload: DrawResponse | null = null;
    try {
        payload = res.json() as unknown as DrawResponse;
    } catch (e) {
        console.error('Failed to parse JSON response:', e);
    }
    
    if (ENABLE_LOGGING) console.log(res.status);
    if (ENABLE_LOGGING) console.log(res.body);
    
    const passed = check(res, {
        'status is 200': (r) => r.status === 200,
        'protocol is HTTP/1.1': (r) => r.proto === 'HTTP/1.1',
        'no performance degradation': (r) => r.timings.duration < 750,
    });
    
    if (!passed) {
        console.warn(`[${new Date().toISOString()}] Performance degradation detected`);
    }
    
    if (res.status !== 200) {
        console.error(`Request failed with status ${res.status}. Stopping VU.`);
        return undefined;
    }
    
    return payload || undefined;
}

export default function () {
    // Typical workflow repeated over time
    const deck_id = createOrShuffleDeck(`${BASE_URL}/api/deck/new/shuffle/?deck_count=6`);
    
    if (deck_id) {
        // Varied draw patterns to simulate real usage
        const drawCounts = [1, 2, 5, 10];
        const count = drawCounts[Math.floor(Math.random() * drawCounts.length)];
        
        drawCards(`${BASE_URL}/api/deck/${deck_id}/draw/?count=${count}`);
        
        sleep(.1);
        
        // Draw again
        drawCards(`${BASE_URL}/api/deck/${deck_id}/draw/?count=${count}`);
        
        // Occasionally reshuffle
        if (Math.random() > 0.6) {
            createOrShuffleDeck(`${BASE_URL}/api/deck/${deck_id}/shuffle/?remaining=true`);
            sleep(.1);
        }
    }

    sleep(.1);
}
