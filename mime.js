// MIME is a registry of the standard MIME types and custom file types.

const fs = require('node:fs');

// cont    offset  type    opcode  mask    value   desc
// metrics.2021-03-15T02-21-47Z-00000
try {
  const data = fs.readFileSync('metrics.2021-03-15T02-21-47Z-00000');
  console.log(strings(data));
} catch (err) {
  console.error(err);
}

function strings(buffer, minLength = 4) {
  const printableChars = /^[\x20-\x7E]+$/; // ASCII printable characters
  let result = [];
  let currentString = '';

  for (let i = 0; i < buffer.length; i++) {
    const char = String.fromCharCode(buffer[i]);
    if (printableChars.test(char)) {
      currentString += char;
    } else {
      if (currentString.length >= minLength) {
        result.push(currentString);
      }
      currentString = '';
    }
  }

  if (currentString.length >= minLength) {
    result.push(currentString);
  }

  return result.join('\n');
}

