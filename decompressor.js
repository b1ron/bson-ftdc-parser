// decompressor.js contains functions to decompress compressed FTDC metrics data.
// Archive File Format - https://github.com/mongodb/mongo/blob/0a68308f0d39a928ed551f285ba72ca560c38576/src/mongo/db/ftdc/README.md#archive-file-format

import * as parser from './parser.js'
import * as utils from './utils.js'

async function inflate(buffer) {
  try {
    const ds = new DecompressionStream('deflate')
    const stream = new Response(buffer).body.pipeThrough(ds)
    const decompressed = await new Response(stream).arrayBuffer()
    return new Uint8Array(decompressed)
  } catch (err) {
    console.error('[inflate] DecompressionStream failed:', err)
    throw err
  }
}

/**
 * Decompresses a zlib-compressed metrics chunk and returns arrays of samples.
 *
 * NOTE: Metrics / variable names are represented using dot-notation
 *       (e.g., 'serverStatus.metrics.document.inserted').
 */
export const uncompress = async function (compressed) {
  let offset = 0

  const samples = {}

  while (true) {
    if (offset >= compressed.length) break

    let buffer = compressed.subarray(offset)
    let size = utils.readUint32LE(buffer)
    buffer = compressed.subarray(offset, offset + size)
    offset += size

    const options = { FTDC: true }
    const ftdcDoc = parser.parseBSON(buffer, options)

    if (ftdcDoc.type === 0) continue

    buffer = await inflate(ftdcDoc.data)

    size = utils.readUint32LE(buffer)

    let refDoc = parser.parseBSON(buffer.subarray(0, size), options)
    buffer = buffer.subarray(size, buffer.length)
    refDoc = flattenObject(refDoc)

    const reader = utils.createBufferReader(buffer)

    const numMetrics = utils.readUint32LE(buffer)
    const numSamples = utils.readUint32LE(buffer, 4)
    buffer = buffer.subarray(4 + 4)

    // sanity check: ensure the number of extracted metrics matches the expected count
    const metrics = extractMetrics(refDoc)
    if (metrics.length !== numMetrics) {
      throw new Error(
        `Expected ${numMetrics} metrics, but found ${metrics.length}`
      )
    }

    // nothing to do...
    if (numSamples === 0) return samples

    const keys = Object.keys(refDoc)
    let zeroCount = 0

    const obj = { ...refDoc }
    for (let i = 0; i < numMetrics; i++) {
      const key = keys[i]
      if (samples[key] === undefined) {
        samples[key] = []
      }
      const deltas = [obj[key]]
      let prev = deltas[0]
      for (let j = 0; j < numSamples; j++) {
        if (zeroCount > 0) {
          deltas.push(prev)
          zeroCount--
          continue
        }
        let { value, read } = decodeVarint(buffer, keys[i])
        buffer = buffer.subarray(read)
        if (value === 0n) {
          let { value, read } = decodeVarint(buffer, keys[i])
          buffer = buffer.subarray(read)
          zeroCount = value
        } else {
          value += prev
          prev = value
          deltas.push(value)
        }
      }
      samples[key].push(...deltas)
    }
  }

  return samples
}

// uses LEB128
function decodeVarint(buffer, key) {
  let i = 0
  let shift = 0n
  let value = 0n

  while (true) {
    let b = buffer[i++]
    if (b === undefined) {
      throw new Error('Buffer index out of bounds')
    }

    if (b < 0x80) {
      value |= BigInt(b) << (1n * shift)
      return { value: value, read: i }
    } else {
      value |= BigInt(b & 0x7f) << (1n * shift)
    }
    shift += 7n

    // prevent reading more than 10 bytes
    if (i > 9) {
      value = 0n
      return { value: value, read: i }
    }
  }
}

function flattenObject(obj, path = '', result = {}) {
  Object.entries(obj).forEach(([key, value]) => {
    if (value.constructor === Object || Array.isArray(value)) {
      return flattenObject(value, path ? path + '.' + key : key, result)
    }

    result[path ? path + '.' + key : key] = value
  })
  return result
}

function isValid(value) {
  if (
    typeof value === 'number' ||
    value instanceof Date ||
    typeof value === 'boolean'
  ) {
    return true
  }

  if (typeof value !== 'string') return false

  const numberStringPattern = /^-?\d+(\.\d+)?$/
  return numberStringPattern.test(value)
}

function extractMetrics(obj) {
  const result = []
  for (const key in obj) {
    let value = obj[key]
    if (!isValid(value)) {
      delete obj[key]
      continue
    }

    if (value instanceof Date) {
      value = value.getTime()
    }
    obj[key] = BigInt(value)
    result.push(BigInt(value))
  }
  return result
}
