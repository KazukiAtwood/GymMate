export function canonicalPair(uidA: string, uidB: string) {
  const members = uidA < uidB ? [uidA, uidB] : [uidB, uidA];

  return {
    members,
    pairId: `${members[0]}__${members[1]}`,
  };
}
