export function mergeMessages(previous, incoming, deleted = new Set()) {
  const byId = new Map(
    previous
      .filter((item) => !deleted.has(item.id))
      .map((item) => [item.id, item]),
  );
  for (const item of incoming) {
    if (deleted.has(item.id)) continue;
    const old = byId.get(item.id);
    byId.set(item.id, {
      ...old,
      ...item,
      is_read: item.is_read === true || old?.is_read === true,
    });
  }
  return [...byId.values()].sort(
    (a, b) =>
      a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
}
