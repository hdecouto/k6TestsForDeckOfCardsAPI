/// <reference types="k6" />
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

// Baseline Test Configuration
// Purpose: Measure stable performance under expected traffic
// Load: Constant 25 VUs for 10 minutes
export const options = {
    vus: 25,
    duration: '10m',
    thresholds: {
        'http_req_failed': ['rate<0.01'],  // Less than 1% errors
        'http_req_duration': ['p(95)<500', 'p(99)<1000'], // 95th percentile under 500ms, 99th under 1s
        'http_reqs': ['rate>50'], // Expect at least 50 requests per second
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
    console.log(`Making request to: ${url}`);
    const res = http.get(url);
    deckLatency.add(res.timings.duration);

    let payload: DeckResponse | null = null;
    try {
        payload = res.json() as DeckResponse;
    } catch (e) {
        console.error('Failed to parse JSON response:', e);
    }
    
    console.log(res.status);
    console.log(res.body);
    
    check(res, {
        'status is 200': (r) => r.status === 200,
        'protocol is HTTP/2': (r) => r.proto === 'HTTP/2.0',
    });
    
    if (res.status !== 200) {
        console.error(`Request failed with status ${res.status}. Stopping VU.`);
        return undefined;
    }
    
    return payload?.deck_id;
}

// Draw cards from deck
function drawCards(url: string): DrawResponse | undefined {
    console.log(`Making request to: ${url}`);
    const res = http.get(url);
    drawLatency.add(res.timings.duration);

    let payload: DrawResponse | null = null;
    try {
        payload = res.json() as DrawResponse;
    } catch (e) {
        console.error('Failed to parse JSON response:', e);
    }
    
    console.log(res.status);
    console.log(res.body);
    
    check(res, {
        'status is 200': (r) => r.status === 200,
        'protocol is HTTP/2': (r) => r.proto === 'HTTP/2.0',
    });
    
    if (res.status !== 200) {
        console.error(`Request failed with status ${res.status}. Stopping VU.`);
        return undefined;
    }
    
    return payload || undefined;
}

export default function () {
    // Realistic workflow: Create deck, draw multiple times, reshuffle
    const deck_id = createOrShuffleDeck('https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=6');
    
    if (deck_id) {
        // Draw different amounts to simulate realistic usage
        const drawCounts = [1, 5, 10];
        const count = drawCounts[Math.floor(Math.random() * drawCounts.length)];
        
        drawCards(`https://deckofcardsapi.com/api/deck/${deck_id}/draw/?count=${count}`);
        
        sleep(Math.random() * 2 + 1); // Random think time between 1-3 seconds
        
        // Sometimes reshuffle
        if (Math.random() > 0.7) {
            createOrShuffleDeck(`https://deckofcardsapi.com/api/deck/${deck_id}/shuffle/?remaining=true`);
        }
    }

    sleep(Math.random() * 2 + 1); // Think time between iterations
}
