// FTDC quick parser

import * as BSON from './constants.js';
import fs from 'fs';

class BSONError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BSONError';
  }
}

// readFTDCFile reads a BSON file to quicky determine if it's an actual FTDC file.
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

  const elementType = buffer[index++];
  switch (elementType) {
  case BSON.DATA_NUMBER:
  case BSON.DATA_DATE:
    // locate the end of the c string
    let i = index;
    while (buffer[i] !== 0x00 && i < buffer.length) {
      i++;
    }
    index = i + 1;
  
    const data = buffer.subarray(index, index + 8);
    const bigint = data.readBigInt64LE(0);
    const date = new Date(Number(bigint));
    console.log(date); // 2021-03-15T02:21:48.000Z
  }

}

readFTDCFile('files/metrics.2021-03-15T02-21-47Z-00000');
