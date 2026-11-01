import type { UserSong } from '@/domain/songs/types'
export interface SongRepository {
 list(): UserSong[]
 get(id: string): UserSong | undefined
 save(song: UserSong): void
 saveMany(songs: UserSong[]): void
 remove(id: string): void
 subscribe(cb: () => void): () => void
 diagnostics():{error:SongStorageError['code']|null;rejected:number}
 recovery(): string | null
 restoreRecovery(): void
}
export class SongStorageError extends Error {
 readonly code: 'quota'|'denied'|'corrupt'|'version'|'backup'
 constructor(code: 'quota'|'denied'|'corrupt'|'version'|'backup', cause?: unknown) {super(`Song storage: ${code}`,{cause});this.code=code}
}
