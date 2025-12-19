/// <reference types="k6" />
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

// Smoke Test Configuration
// Purpose: Validate scripts + basic latency/error
// Load: Very low (1-2 VUs for 1-2 minutes)
export const options = {
    vus: 2,
    duration: '2m',
    thresholds: {
        'http_req_failed': ['rate<0.01'],  // Less than 1% errors
        'http_req_duration': ['p(95)<500'], // 95% of requests under 500ms
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

    check(res, {
        'status is 200': (r) => r.status === 200,
        'has deck_id': (r) => {
            const body = r.json() as DeckResponse;
            return body.deck_id !== undefined;
        },
    });

    if (res.status !== 200) {
        console.error(`Request failed with status ${res.status}`);
        return undefined;
    }

    const payload = res.json() as DeckResponse;
    return payload?.deck_id;
}

// Draw cards from deck
function drawCards(url: string): DrawResponse | undefined {
    const res = http.get(url);
    drawLatency.add(res.timings.duration);

    check(res, {
        'status is 200': (r) => r.status === 200,
        'has cards': (r) => {
            const body = r.json() as DrawResponse;
            return body.cards && body.cards.length > 0;
        },
    });

    if (res.status !== 200) {
        console.error(`Request failed with status ${res.status}`);
        return undefined;
    }

    return res.json() as DrawResponse;
}

export default function () {
    // Simple workflow: Create deck and draw cards
    const deck_id = createOrShuffleDeck('https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1');
    
    if (deck_id) {
        drawCards(`https://deckofcardsapi.com/api/deck/${deck_id}/draw/?count=5`);
    }

    sleep(1); // Think time between iterations
}
