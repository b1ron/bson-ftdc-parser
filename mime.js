// FTDC quick parser

import { get } from 'http';
import * as BSON from './constants.js';
import fs from 'fs';

class BSONError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BSONError';
  }
}



/**
 * Finds the index before the first occurrence of ':' in the stream.
 *
 * @param {string|Buffer} stream - The internal serialization buffer.
 * @param {number} offset - The starting position for the search.
 * @returns {number|null} - The index before ':' or null if not found.
 */
function indexBeforeColon(stream, offset = 0) {
  if (!stream || stream.length === 0) {
    return null;
  }

  let i = offset;
  while (i < stream.length && stream[i] !== ':') {
    i++;
  }

  return i < stream.length ? i - 1 : null; // return index before ':', or null if not found
}

/**
 * Reads a BSON file to quicky determine if it's an actual FTDC file.
 *
 * @param {string} filename - The file to read
 * @returns {boolean} true if the file is an FTDC file
 */
function readFTDCFile(filename) {
  let buffer = fs.readFileSync(filename);
  const size = buffer.readUInt32LE(0);
  buffer = buffer.subarray(0, size);
  if (size < 5) {
    throw new BSONError('Invalid BSON size');
  }
  if (buffer[size - 1] !== 0) {
    throw new BSONError('Invalid BSON terminator');
  }

  let index = 4;

  while (index < buffer.length) {
    const elementType = buffer[index++];

    if (elementType === 0) {
      continue;
    }


    console.log('field:', indexBeforeColon(buffer, index));

    // locate the end of the c string
    let i = index;
    while (buffer[i] !== 0x00 && i < buffer.length) {
      i++;
    }
    index = i + 1;

    switch (elementType) {
    case BSON.DATA_NUMBER:
      console.log('Number');
      const i = indexBeforeColon(buffer, index);
      console.log(index, i);
    case BSON.DATA_STRING:
      console.log('String');
    case BSON.DATA_OBJECT:
      console.log('Object');
    case BSON.DATA_ARRAY:
      console.log('Array');
    case BSON.DATA_BINARY:
      console.log('Binary');
    case BSON.DATA_UNDEFINED:
      console.log('Undefined');
    case BSON.DATA_OBJECTID:
      console.log('ObjectId');
    case BSON.DATA_BOOLEAN:
      console.log('Boolean');
    case BSON.DATA_DATE:
      const data = buffer.subarray(index, index + 8);
      const bigInt = data.readBigInt64LE(0);
      const date = new Date(Number(bigInt));
      console.log(date);

      index += 8;

    case BSON.DATA_NULL:
      console.log('Null', index);
    case BSON.DATA_REGEXP:
      console.log('RegExp');
    case BSON.DATA_DBPOINTER:
      console.log('DBPointer');
    case BSON.DATA_CODE:
      console.log('Code');
    case BSON.DATA_SYMBOL:
      console.log('Symbol');
    case BSON.DATA_CODE_W_SCOPE:
      console.log('Code with scope');
    case BSON.DATA_INT32:
      console.log('Int32');
    case BSON.DATA_TIMESTAMP:
      console.log('Timestamp');
    case BSON.DATA_LONG:
      console.log('Long');
    case BSON.DATA_DECIMAL128:
      console.log('Decimal128');
    case BSON.DATA_MIN_KEY:
      console.log('MinKey');
    }
  }

  return true;
}

readFTDCFile('files/metrics.2021-03-15T02-21-47Z-00000');
