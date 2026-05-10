/**
 * `fetch` with optional timeout and parent {@link AbortSignal} linkage.
 * @param {string} url
 * @param {RequestInit & { timeoutMs?: number }} [options]
 * @returns {Promise<Response>}
 */
export async function fetchWithTimeout(url, options = {}) {
  const { timeoutMs = 20000, signal: outerSignal, ...init } = options;
  const controller = new AbortController();
  const { signal } = controller;
  const timer = setTimeout(() => {
    controller.abort(new DOMException("The operation timed out.", "TimeoutError"));
  }, timeoutMs);

  const forwardAbort = () => {
    controller.abort(outerSignal?.reason);
  };

  if (outerSignal) {
    if (outerSignal.aborted) {
      clearTimeout(timer);
      throw Object.assign(new DOMException("Aborted", "AbortError"), { cause: outerSignal.reason });
    }
    outerSignal.addEventListener("abort", forwardAbort, { once: true });
  }

  try {
    return await fetch(url, { ...init, signal });
  } finally {
    clearTimeout(timer);
    if (outerSignal) outerSignal.removeEventListener("abort", forwardAbort);
  }
}

/**
 * GET JSON with the same timeout/abort behavior as {@link fetchWithTimeout}.
 * @param {string} url
 * @param {RequestInit & { timeoutMs?: number }} [options]
 * @returns {Promise<unknown>}
 */
export async function fetchJsonWithTimeout(url, options = {}) {
  const res = await fetchWithTimeout(url, options);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}
