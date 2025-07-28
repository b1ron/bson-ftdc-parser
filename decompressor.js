// decompressor.js contains functions to decompress compressed FTDC metrics data.
// Archive File Format - https://github.com/mongodb/mongo/blob/0a68308f0d39a928ed551f285ba72ca560c38576/src/mongo/db/ftdc/README.md#archive-file-format

import * as parser from './parser.js';
import * as utils from './utils.js';

async function inflate(buffer) {
  try {
    const ds = new DecompressionStream('deflate');
    const stream = new Response(buffer).body.pipeThrough(ds);
    const decompressed = await new Response(stream).arrayBuffer();
    return new Uint8Array(decompressed);
  } catch (err) {
    console.error('[inflate] DecompressionStream failed:', err);
    throw err;
  }
}

/**
 * Decompresses a zlib-compressed metrics chunk and yields arrays of samples.
 *
 * This is an async generator that processes a compressed metrics buffer chunk-by-chunk,
 * restoring individual samples and yielding them incrementally.
 *
 * NOTE: Metrics / variable names are represented using dot-notation
 *       (e.g., 'serverStatus.metrics.document.inserted').
 */
export const uncompress = async function* (compressed) {
  let offset = 0;

  while (true) {
    if (offset >= compressed.length) break;

    let buffer = compressed.subarray(offset);
    let size = utils.readUint32LE(buffer);
    buffer = compressed.subarray(offset, offset + size);
    offset += size;

    const options = { FTDC: true };
    const ftdcDoc = parser.parseBSON(buffer, options);

    if (ftdcDoc.type === 0) continue;

    buffer = await inflate(ftdcDoc.data);

    size = utils.readUint32LE(buffer);

    let refDoc = parser.parseBSON(buffer.subarray(0, size), options);
    buffer = buffer.subarray(size, buffer.length);
    refDoc = flattenObject(refDoc);

    const reader = utils.createBufferReader(buffer);

    const numMetrics = reader.readUint32LE();
    const numSamples = reader.readUint32LE();

    // sanity check: ensure the number of extracted metrics matches the expected count
    const metrics = extractBaseMetrics(refDoc);
    if (metrics.length !== numMetrics) {
      throw new Error(
        `Expected ${numMetrics} metrics, but found ${metrics.length}`
      );
    }

    // nothing to do...
    if (numSamples === 0) return;

    let deltas = decodeDeltas(reader);
    deltas = applyDeltas(deltas, metrics, numSamples);

    const samples = reconstructSamplesFromDeltas(refDoc, deltas, numSamples);
    yield samples;
  }
};

function reconstructSamplesFromDeltas(obj, deltas, numSamples) {
  const samples = [];
  const keys = Object.keys(obj);

  // iterate row-wise over restored deltas, mapping each value to its corresponding
  // variable name from obj
  for (let i = 0; i < numSamples; i++) {
    for (let j = 0; j < keys.length; j++) {
      const index = j * numSamples + i;
      const value = deltas[index];
      if (value === undefined) {
        throw new RangeError('Index is outside the bounds of the deltas array');
      }

      const key = keys[j];
      obj[key] = value;
    }
    samples.push(obj);
  }
  return samples;
}

function applyDeltas(deltas, metrics, numSamples) {
  const result = [];
  for (let i = 0; i < metrics.length; i++) {
    const offset = i * numSamples;

    // add base value to the first delta
    deltas[offset] += metrics[i];
    result[offset] = deltas[offset];

    for (let j = 1; j < numSamples; j++) {
      const index = offset + j;
      if (deltas[index] === undefined || deltas[index - 1] === undefined) {
        throw new RangeError('Index is outside the bounds of the deltas array');
      }

      deltas[index] += deltas[index - 1];
      result[index] = deltas[index];
    }
  }
  return result;
}

function decodeDeltas(reader) {
  const deltas = [];
  let zeroCount = 0;
  while (!reader.isEmpty()) {
    if (zeroCount > 0n) {
      zeroCount--;
      deltas.push(0n);
      continue;
    }

    const value = reader.decodeVarint();
    if (value === 0n) {
      zeroCount = reader.decodeVarint();
    }

    deltas.push(value);
  }
  return deltas;
}

function flattenObject(obj, path = '', result = {}) {
  Object.entries(obj).forEach(([key, value]) => {
    if (value.constructor === Object || Array.isArray(value)) {
      return flattenObject(value, path ? path + '.' + key : key, result);
    }

    result[path ? path + '.' + key : key] = value;
  });
  return result;
}

function isValid(value) {
  if (
    typeof value === 'number' ||
    value instanceof Date ||
    typeof value === 'boolean'
  ) {
    return true;
  }

  if (typeof value !== 'string') return false;

  const numberStringPattern = /^-?\d+(\.\d+)?$/;
  return numberStringPattern.test(value);
}

function extractBaseMetrics(obj) {
  const result = [];
  for (const key in obj) {
    let value = obj[key];
    if (!isValid(value)) {
      delete obj[key];
      continue;
    }

    if (value instanceof Date) {
      value = value.getTime();
    }
    result.push(BigInt(value));
  }
  return result;
}
