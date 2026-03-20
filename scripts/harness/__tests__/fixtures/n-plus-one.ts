/**
 * @unit test-unit
 * @layer usecase
 */
async function loadAll(ids: string[]) {
  const results = [];

  for (const id of ids) {
    const item = await repository.findOne(id);
    results.push(item);
  }

  return results;
}
