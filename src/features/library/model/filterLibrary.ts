import type { ContentArtist } from '@/core/plugin/types';
export interface LibraryFilters {search:string;composer:string;genre:string}
export function filterLibrary(artists:ContentArtist[],{search,composer,genre}:LibraryFilters):ContentArtist[]{
 const query=search.trim().toLowerCase()
 return artists.map(artist=>({...artist,songs:artist.songs.filter(song=>
  (composer==='all'||(song.meta.composer??'—')===composer)&&
  (genre==='all'||(song.meta.genre??'—')===genre)&&
  `${artist.meta.name} ${song.meta.title} ${song.meta.composer??''} ${song.meta.tags?.join(' ')??''}`.toLowerCase().includes(query)
 )})).filter(artist=>artist.songs.length>0)
}
