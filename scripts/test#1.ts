/// <reference types="k6" />
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import exec from 'k6/execution';

export const options = {
    vus: 1,
    duration: '10s',
}
const latency = new Trend('latency');

interface ApiResponse {
    status?: string;
    deck_id?: string;
    shuffled?: boolean;
    remaining?: number;
}

function makeRequest(url: string) {
  console.log(`Making request to: ${url}`);
  const res = http.get(url);
  latency.add(res.timings.duration);

  let payload: ApiResponse | null = null;
  try {
      payload = res.json() as ApiResponse;
      } catch (e) {
                console.error('Failed to parse JSON response:', e);
    };
    console.log(res.status);        // HTTP status code
    console.log(res.body);          // Response body
    console.log(res.json());        // Parsed JSON (if applicable)
    check(res, {
    'status is 200': (r) => r.status === 200,
    'protocol is HTTP/2': (r) => r.proto === 'HTTP/2.0',
  });
  
  if (res.status !== 200) {
    console.error(`Request failed with status ${res.status}. Stopping VU.`);
    exec.test.abort();
  }
  

//   console.log(response);  uncomment to see typescript catch type errors
}

export default function () {
  const deck_id = makeRequest('https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1');
  makeRequest(`https://deckofcardsapi.com/api/deck/${deck_id}/draw/?count=2`);
}