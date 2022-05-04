import type { FileHandle } from 'fs/promises'

declare function exportCar(
  file: FileHandle,
  path?: string
): AsyncGenerator<Uint8Array>

export { exportCar }
