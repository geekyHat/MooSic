/** Exact artist identity ignores casing, accents and repeated whitespace. */
export function artistKey(name: string): string {
  return name.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ')
}

export function artistNames(names: string[]): string[] {
  const unique = new Map<string, string>()
  for (const name of names) {
    const clean = name.trim().replace(/\s+/g, ' ')
    if (clean && !unique.has(artistKey(clean))) unique.set(artistKey(clean), clean)
  }
  return [...unique.values()]
}

export function canonicalArtist(name: string, names: string[]): string {
  const key = artistKey(name)
  return names.find(candidate => artistKey(candidate) === key) ?? name.trim().replace(/\s+/g, ' ')
}

export interface ArtistLink {alias: string; name: string}
export function artistLinks(songs: {artist: string; artistAliases?: string[]}[]): ArtistLink[] {
  return songs.flatMap(song => (song.artistAliases ?? []).map(alias => ({alias, name: song.artist})))
}
export function resolveArtist(name: string, links: ArtistLink[]): string {
  const seen = new Set<string>()
  let current = name
  while (!seen.has(artistKey(current))) {
    seen.add(artistKey(current))
    const targets = artistNames(links.filter(link => artistKey(link.alias) === artistKey(current)).map(link => link.name))
    if (targets.length !== 1 || artistKey(targets[0]) === artistKey(current)) break
    current = targets[0]
  }
  return current
}

function distance(a: string, b: string): number {
  let previous = Array.from({length: b.length + 1}, (_, index) => index)
  for (let i = 0; i < a.length; i++) {
    const next = [i + 1]
    for (let j = 0; j < b.length; j++) {
      next.push(Math.min(next[j] + 1, previous[j + 1] + 1, previous[j] + (a[i] === b[j] ? 0 : 1)))
    }
    previous = next
  }
  return previous[b.length]
}

/** Similar names are suggestions only: they must be selected explicitly. */
export function suggestArtists(query: string, names: string[], limit = 6): string[] {
  const key = artistKey(query)
  if (!key) return []
  return artistNames(names).map(name => {
    const candidate = artistKey(name)
    const words = (text: string) => text.replace(/\([^)]*\)/g, '').split(/[^\p{L}\p{N}]+/u).filter(word => word.length >= 4)
    const partial = words(key).some(word => words(candidate).some(other => word === other || word.startsWith(other) || other.startsWith(word) || Math.abs(word.length-other.length)<=1 && distance(word, other)<=1))
    const score = candidate === key ? 0 : candidate.startsWith(key) ? 1 : candidate.includes(key) ? 2
      : partial || key.length >= 4 && Math.abs(candidate.length - key.length) <= 2 && distance(key, candidate) <= (key.length >= 8 ? 2 : 1) ? 3 : 4
    return {name, score}
  }).filter(item => item.score < 4)
    .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name))
    .slice(0, limit).map(item => item.name)
}
