/** Static hosts may serve .gz as a compressed response or as a gzip file.
 * Fetch already decodes Content-Encoding; inspect the payload to avoid decoding twice.
 */
import { ViewerError } from './errors';

export async function decodeModelResponse(
  response: Response,
  expectedBytes: number,
  compressed: boolean,
): Promise<ArrayBuffer> {
  if (!response.ok) throw new ViewerError('fileLoad', 'An anatomy file could not be loaded.');
  const payload = await response.arrayBuffer(),
    signature = new Uint8Array(payload, 0, Math.min(2, payload.byteLength));
  const gzip = compressed && signature[0] === 0x1f && signature[1] === 0x8b;
  const buffer = gzip
    ? await new Response(
        new Blob([payload]).stream().pipeThrough(new DecompressionStream('gzip')),
      ).arrayBuffer()
    : payload;
  if (buffer.byteLength !== expectedBytes)
    throw new ViewerError(
      'fileIncomplete',
      'An anatomy file was incomplete. Please reload the viewer.',
    );
  return buffer;
}
