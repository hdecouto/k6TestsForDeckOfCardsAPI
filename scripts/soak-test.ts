/// <reference types="k6" />
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

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
    const res = http.get(url);
    deckLatency.add(res.timings.duration);

    const passed = check(res, {
        'status is 200': (r) => r.status === 200,
        'has deck_id': (r) => {
            const body = r.json() as DeckResponse;
            return body.deck_id !== undefined;
        },
        'no performance degradation': (r) => r.timings.duration < 750, // Alert if slowing down
    });

    if (!passed) {
        console.warn(`[${new Date().toISOString()}] Performance degradation detected`);
    }

    if (res.status !== 200) {
        return undefined;
    }

    const payload = res.json() as DeckResponse;
    return payload?.deck_id;
}

// Draw cards from deck
function drawCards(url: string): DrawResponse | undefined {
    const res = http.get(url);
    drawLatency.add(res.timings.duration);

    const passed = check(res, {
        'status is 200': (r) => r.status === 200,
        'has cards': (r) => {
            const body = r.json() as DrawResponse;
            return body.cards && body.cards.length > 0;
        },
        'no performance degradation': (r) => r.timings.duration < 750,
    });

    if (!passed) {
        console.warn(`[${new Date().toISOString()}] Performance degradation detected`);
    }

    if (res.status !== 200) {
        return undefined;
    }

    return res.json() as DrawResponse;
}

export default function () {
    // Typical workflow repeated over time
    const deck_id = createOrShuffleDeck('https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=6');
    
    if (deck_id) {
        // Varied draw patterns to simulate real usage
        const drawCounts = [1, 2, 5, 10];
        const count = drawCounts[Math.floor(Math.random() * drawCounts.length)];
        
        drawCards(`https://deckofcardsapi.com/api/deck/${deck_id}/draw/?count=${count}`);
        
        sleep(Math.random() * 2 + 1); // 1-3 seconds think time
        
        // Draw again
        drawCards(`https://deckofcardsapi.com/api/deck/${deck_id}/draw/?count=${count}`);
        
        // Occasionally reshuffle
        if (Math.random() > 0.6) {
            createOrShuffleDeck(`https://deckofcardsapi.com/api/deck/${deck_id}/shuffle/?remaining=true`);
            sleep(0.5);
        }
    }

    sleep(Math.random() * 2 + 1); // Think time between iterations
}
