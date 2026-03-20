/**
 * @unit test-unit
 * @layer usecase
 */
const API_KEY = "sk-1234567890abcdef";
const password = "supersecret123";

async function processItems(items: string[]) {
  for (const item of items) {
    await fetch(item);
  }
}
