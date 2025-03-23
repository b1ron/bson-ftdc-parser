// MIME type detection

const fs = require('node:fs');

try {
  let data = fs.readFileSync('files/small.pdf');
  console.log(dump(data));
  data = fs.readFileSync('files/metrics.2021-03-15T02-21-47Z-00000');
  console.log(dump(data));
} catch (err) {
  console.error(err);
}

// { sp: '', hex: '25 50 44 46 2d 31 2e 34', ascii: '%PDF-1.4' } - PDF file with magic pattern string at offset 0 and version at offset 5
// 0	string		%PDF-		PDF document
// !:mime	application/pdf
// !:strength +60
// !:ext	pdf
// >5	byte		x		\b, version %c
// >7	byte		x		\b.%c
// >0	use		pdf
//
// { sp: '', hex: 'e5 2f 00 00 09 5f 69 64', ascii: 'å/\x00\x00\t_id' } - FTDC data file

// An xxd-like function to dump the first 8 bytes of a buffer in hex and ASCII.
function dump(buffer, maxLength = 8) {
  let output = {
    sp: ' ',
    hex: '',
    ascii: '',
  };
  for (let i = 0; i < maxLength; i++) {
    const hex = parseInt(buffer[i], 10).toString(16);
    if (i >= maxLength-1) {
      output.sp = '';
    }
    output.hex += hex.padStart(2, '0') + output.sp;
    output.ascii += String.fromCharCode(buffer[i]);
  }

  delete output.sp;
  return output;
}

// A re-implementation of the Unix strings command.
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
