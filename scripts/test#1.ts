import http from 'k6/http';
import { check } from 'k6';

export default function () {
  const res = http.get('https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'protocol is HTTP/2': (r) => r.proto === 'HTTP/2.0',
  });
//   console.log(response);  uncomment to see typescript catch type errors
}