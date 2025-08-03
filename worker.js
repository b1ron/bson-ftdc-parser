import { uncompress } from './decompressor.js';

onmessage = async (e) => {
  const buffer = new Uint8Array(e.data);
  const result = await uncompress(buffer);
  postMessage(result);
}
