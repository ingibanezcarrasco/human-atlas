/** Failures the viewer can report; the UI turns each code into a message in the active language. */
export type ErrorCode =
  | 'webgl'
  | 'contextLost'
  | 'catalogue'
  | 'fileLoad'
  | 'fileIncomplete'
  | 'assemble'
  | 'load';

export class ViewerError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export function errorCode(e: unknown, fallback: ErrorCode): ErrorCode {
  return e instanceof ViewerError ? e.code : fallback;
}
