/// <reference types="k6" />
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

// Stress Test Configuration
// Purpose: Find saturation point and observe failure modes
// Load: Ramp from 10 → 50 → 100 VUs
export const options = {
    stages: [
        { duration: '2m', target: 10 },   // Ramp up to 10 VUs
        { duration: '3m', target: 10 },   // Stay at 10 VUs
        { duration: '2m', target: 50 },   // Ramp up to 50 VUs
        { duration: '3m', target: 50 },   // Stay at 50 VUs
        { duration: '2m', target: 100 },  // Ramp up to 100 VUs
        { duration: '3m', target: 100 },  // Stay at 100 VUs
        { duration: '2m', target: 0 },    // Ramp down to 0
    ],
    thresholds: {
        'http_req_failed': ['rate<0.05'],  // Less than 5% errors (relaxed for stress)
        'http_req_duration': ['p(95)<1000'], // 95th percentile under 1s (relaxed)
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
        'response time OK': (r) => r.timings.duration < 2000,
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
        'response time OK': (r) => r.timings.duration < 2000,
    });
    
    if (res.status !== 200) {
        console.error(`Request failed with status ${res.status}. Stopping VU.`);
        return undefined;
    }
    
    return payload || undefined;
}

export default function () {
    // Aggressive workflow with minimal think time
    const deck_id = createOrShuffleDeck('https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=6');
    
    if (deck_id) {
        // Rapid-fire draws
        drawCards(`https://deckofcardsapi.com/api/deck/${deck_id}/draw/?count=5`);
        sleep(0.5); // Minimal think time
        
        drawCards(`https://deckofcardsapi.com/api/deck/${deck_id}/draw/?count=10`);
        sleep(0.5);
        
        // Reshuffle
        createOrShuffleDeck(`https://deckofcardsapi.com/api/deck/${deck_id}/shuffle/?remaining=true`);
    }

    sleep(0.5); // Minimal think time to maximize load
}
