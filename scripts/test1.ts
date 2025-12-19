/// <reference types="k6" />
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import exec from 'k6/execution';

// Enable/disable console logging
const ENABLE_LOGGING = true;

// Base URL for the Deck of Cards API
const BASE_URL = 'http://127.0.0.1:8000';

export const options = {
    vus: 1,
    duration: '3s',
}

// Separate metrics for each request type
const deckLatency = new Trend('deck_operations_latency');
const drawLatency = new Trend('draw_cards_latency');
const pileLatency = new Trend('pile_operations_latency');
const genericLatency = new Trend('generic_request_latency');

// Card structure
interface CardData {
    code: string;
    image: string;
    images: {
        svg: string;
        png: string;
    };
    value: string;
    suit: string;
}

// Deck operations response (new, shuffle, reshuffle)
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
    cards: CardData[];
    remaining: number;
}

// Pile operations response
interface PileResponse {
    success: boolean;
    deck_id: string;
    remaining: number;
    piles: {
        [pileName: string]: {
            remaining: number;
            cards?: CardData[];
        }
    };
    cards?: CardData[]; // For draw from pile operations
}

// Generic request function for deck operations
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
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'protocol is HTTP/1.1': (r) => r.proto === 'HTTP/1.1',
  });
  
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
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'protocol is HTTP/1.1': (r) => r.proto === 'HTTP/1.1',
  });
  
  if (res.status !== 200) {
    console.error(`Request failed with status ${res.status}. Stopping VU.`);
    return undefined;
  }
  
  return payload || undefined;
}

// Pile operations
function managePile(url: string): PileResponse | undefined {
  if (ENABLE_LOGGING) console.log(`Making request to: ${url}`);
  const res = http.get(url);
  pileLatency.add(res.timings.duration);

  let payload: PileResponse | null = null;
  try {
      payload = res.json() as unknown as PileResponse;
  } catch (e) {
      console.error('Failed to parse JSON response:', e);
  }
  
  if (ENABLE_LOGGING) console.log(res.status);
  if (ENABLE_LOGGING) console.log(res.body);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'protocol is HTTP/1.1': (r) => r.proto === 'HTTP/1.1',
  });
  
  if (res.status !== 200) {
    console.error(`Request failed with status ${res.status}. Stopping VU.`);
    return undefined;
  }
  
  return payload || undefined;
}

// Generic function for operations that don't need specific return data
function makeRequest(url: string): string | undefined {
  if (ENABLE_LOGGING) console.log(`Making request to: ${url}`);
  const res = http.get(url);
  genericLatency.add(res.timings.duration);

  let payload: DeckResponse | null = null;
  try {
      payload = res.json() as unknown as DeckResponse;
  } catch (e) {
      console.error('Failed to parse JSON response:', e);
  }
  
  if (ENABLE_LOGGING) console.log(res.status);
  if (ENABLE_LOGGING) console.log(res.body);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'protocol is HTTP/1.1': (r) => r.proto === 'HTTP/1.1',
  });
  
  if (res.status !== 200) {
    console.error(`Request failed with status ${res.status}. Stopping VU.`);
    return undefined;
  }
  
  return payload?.deck_id;
}

export default function () {
    // 1. Create a brand new deck (not shuffled)
    const single_deck_id = createOrShuffleDeck(`${BASE_URL}/api/deck/new/`);
    
    // 2. Shuffle the deck with multiple decks
    const deck_id = createOrShuffleDeck(`${BASE_URL}/api/deck/new/shuffle/?deck_count=6`);
  
    if (deck_id) {
        // 3. Draw cards from deck
        const drawnCards = drawCards(`${BASE_URL}/api/deck/${deck_id}/draw/?count=2`);
        
        // 4. Reshuffle remaining cards in deck
        createOrShuffleDeck(`${BASE_URL}/api/deck/${deck_id}/shuffle/?remaining=true`);
        
        // 5. Add cards to a pile
        managePile(`${BASE_URL}/api/deck/${deck_id}/pile/discard/add/?cards=AS,2S`);
        
        // 6. Shuffle a pile
        managePile(`${BASE_URL}/api/deck/${deck_id}/pile/discard/shuffle/`);
        
        // 7. List cards in pile
        const pileList = managePile(`${BASE_URL}/api/deck/${deck_id}/pile/discard/list/`);
        
        // 8. Draw from pile by count
        // const pileDrawCount = managePile(`https://deckofcardsapi.com/api/deck/${deck_id}/pile/discard/draw/?count=1`);
        
        // 9. Draw from pile bottom
        const pileDrawBottom = managePile(`${BASE_URL}/api/deck/${deck_id}/pile/discard/draw/bottom/`);
        
        // 10. Draw from pile random
        const pileDrawRandom = managePile(`${BASE_URL}/api/deck/${deck_id}/pile/discard/draw/random/`);
        
        // 11. Return cards to deck
        makeRequest(`${BASE_URL}/api/deck/${deck_id}/return/?cards=AS,2S`);
        
        // 12. Return cards from pile to deck
        managePile(`${BASE_URL}/api/deck/${deck_id}/pile/discard/return/`);
    }
  
    // 13. Create partial deck with specific cards
    const partial_deck = createOrShuffleDeck(`${BASE_URL}/api/deck/new/shuffle/?cards=AS,2S,KS,AD,2D,KD,AC,2C,KC,AH,2H,KH`);
    
    // 14. Create deck with jokers enabled
    const joker_deck = createOrShuffleDeck(`${BASE_URL}/api/deck/new/?jokers_enabled=true`);
    
    // 15. Draw from new deck (shortcut that creates and draws in one request)
    const new_deck_with_draw = drawCards(`${BASE_URL}/api/deck/new/draw/?count=2`);
  
    sleep(.1);
}