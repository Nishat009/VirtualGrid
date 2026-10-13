export interface Person {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  age: number;
  city: string;
  salary: number;
  joined: string;
}

const FIRST = ['Ayesha', 'Rahim', 'Nadia', 'Tanvir', 'Mitu', 'Arif', 'Sara', 'Imran', 'Lina', 'Fahim'];
const LAST = ['Khan', 'Ahmed', 'Hossain', 'Rahman', 'Islam', 'Chowdhury', 'Sarkar', 'Das', 'Roy', 'Uddin'];
const CITIES = ['Dhaka', 'Chattogram', 'Sylhet', 'Khulna', 'Rajshahi', 'Barishal', 'Rangpur', 'Mymensingh'];

/** Small seeded PRNG so every run (and every benchmark) sees identical data. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(items: readonly T[], rand: () => number): T {
  const item = items[Math.floor(rand() * items.length)];
  if (item === undefined) throw new Error('pick() from empty list');
  return item;
}

export function makeRows(count: number, seed = 42): Person[] {
  const rand = mulberry32(seed);
  const start = Date.UTC(2015, 0, 1);
  const span = Date.UTC(2026, 0, 1) - start;
  const rows = new Array<Person>(count);
  for (let i = 0; i < count; i++) {
    const firstName = pick(FIRST, rand);
    const lastName = pick(LAST, rand);
    rows[i] = {
      id: i + 1,
      firstName,
      lastName,
      email: `${firstName}.${lastName}${i}@example.com`.toLowerCase(),
      age: 20 + Math.floor(rand() * 45),
      city: pick(CITIES, rand),
      salary: 30_000 + Math.floor(rand() * 170_000),
      joined: new Date(start + Math.floor(rand() * span)).toISOString().slice(0, 10),
    };
  }
  return rows;
}
