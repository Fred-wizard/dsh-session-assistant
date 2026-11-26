import { createReadStream } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { pipeline } from 'node:stream/promises'
import { createZstdDecompress } from 'node:zlib'

export function isCompressedCodexRollout(path) {
  return path.endsWith('.jsonl.zst')
}

export async function readCompressedRollout(path, limit = Infinity) {
  const input = createReadStream(path)
  const decoder = createZstdDecompress()
  const chunks = []
  let bytes = 0
  const pump = pipeline(input, decoder).catch((error) => error)
  try {
    for await (const chunk of decoder) {
      const keep = chunk.subarray(0, limit - bytes)
      chunks.push(keep)
      bytes += keep.length
      if (bytes >= limit) break
    }
    const error = await pump
    if (error && bytes < limit) throw error
  } finally {
    input.destroy()
    decoder.destroy()
  }
  return Buffer.concat(chunks).toString('utf8')
}

export function readCodexRollout(path) {
  return isCompressedCodexRollout(path) ? readCompressedRollout(path) : readFile(path, 'utf8')
}

export async function* readCodexRolloutLines(path) {
  const input = createReadStream(path)
  const decoder = isCompressedCodexRollout(path) ? createZstdDecompress() : null
  const pump = decoder ? pipeline(input, decoder).catch((error) => error) : null
  try {
    yield* createInterface({ input: decoder || input, crlfDelay: Infinity })
    const error = await pump
    if (error) throw error
  } finally {
    input.destroy()
    decoder?.destroy()
  }
}
