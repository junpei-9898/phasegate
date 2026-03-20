// @unit validator-system
// @layer infrastructure

export function fetchData(url: string): Promise<Response> {
  return fetch(url);
}

export function buildQuery(param: string): string {
  return `SELECT name FROM users WHERE status = 'active' AND id = ?`;
}
