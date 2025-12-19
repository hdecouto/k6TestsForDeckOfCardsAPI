/// <reference types="k6" />
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import exec from 'k6/execution';

export const options = {
    vus: 1,
    duration: '10s',
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

// Pile operations
function managePile(url: string): PileResponse | undefined {
  console.log(`Making request to: ${url}`);
  const res = http.get(url);
  pileLatency.add(res.timings.duration);

  let payload: PileResponse | null = null;
  try {
      payload = res.json() as PileResponse;
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

// Generic function for operations that don't need specific return data
function makeRequest(url: string): string | undefined {
  console.log(`Making request to: ${url}`);
  const res = http.get(url);
  genericLatency.add(res.timings.duration);

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

export default function () {
    // 1. Create a brand new deck (not shuffled)
    const single_deck_id = createOrShuffleDeck('https://deckofcardsapi.com/api/deck/new/');
    
    // 2. Shuffle the deck with multiple decks
    const deck_id = createOrShuffleDeck('https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=6');
  
    if (deck_id) {
        // 3. Draw cards from deck
        const drawnCards = drawCards(`https://deckofcardsapi.com/api/deck/${deck_id}/draw/?count=2`);
        
        // 4. Reshuffle remaining cards in deck
        createOrShuffleDeck(`https://deckofcardsapi.com/api/deck/${deck_id}/shuffle/?remaining=true`);
        
        // 5. Add cards to a pile
        managePile(`https://deckofcardsapi.com/api/deck/${deck_id}/pile/discard/add/?cards=AS,2S`);
        
        // 6. Shuffle a pile
        managePile(`https://deckofcardsapi.com/api/deck/${deck_id}/pile/discard/shuffle/`);
        
        // 7. List cards in pile
        const pileList = managePile(`https://deckofcardsapi.com/api/deck/${deck_id}/pile/discard/list/`);
        
        // 8. Draw from pile by count
        // const pileDrawCount = managePile(`https://deckofcardsapi.com/api/deck/${deck_id}/pile/discard/draw/?count=1`);
        
        // 9. Draw from pile bottom
        const pileDrawBottom = managePile(`https://deckofcardsapi.com/api/deck/${deck_id}/pile/discard/draw/bottom/`);
        
        // 10. Draw from pile random
        const pileDrawRandom = managePile(`https://deckofcardsapi.com/api/deck/${deck_id}/pile/discard/draw/random/`);
        
        // 11. Return cards to deck
        makeRequest(`https://deckofcardsapi.com/api/deck/${deck_id}/return/?cards=AS,2S`);
        
        // 12. Return cards from pile to deck
        managePile(`https://deckofcardsapi.com/api/deck/${deck_id}/pile/discard/return/`);
    }
  
    // 13. Create partial deck with specific cards
    const partial_deck = createOrShuffleDeck('https://deckofcardsapi.com/api/deck/new/shuffle/?cards=AS,2S,KS,AD,2D,KD,AC,2C,KC,AH,2H,KH');
    
    // 14. Create deck with jokers enabled
    const joker_deck = createOrShuffleDeck('https://deckofcardsapi.com/api/deck/new/?jokers_enabled=true');
    
    // 15. Draw from new deck (shortcut that creates and draws in one request)
    const new_deck_with_draw = drawCards('https://deckofcardsapi.com/api/deck/new/draw/?count=2');
  
    sleep(.1);
}