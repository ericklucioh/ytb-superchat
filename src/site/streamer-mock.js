const MOCK_DECK_URL = new URL("./streamer-mock.json", import.meta.url);
const MOCK_ROOM_ID = "mock-layout";

export async function loadMockDeck() {
  const response = await fetch(MOCK_DECK_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load mock deck: ${response.status} ${response.statusText}`);
  }

  const deck = await response.json();
  if (!Array.isArray(deck)) {
    return [];
  }

  return deck.filter((item) => item && typeof item === "object");
}

export async function buildMockDeck() {
  return loadMockDeck();
}

export function getMockRoomId() {
  return MOCK_ROOM_ID;
}
