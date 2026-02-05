'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/358ac464-126c-4586-baaa-029d52284005', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'error.tsx:Error',
        message: 'Error boundary triggered with details',
        data: {
          message: error?.message,
          stack: error?.stack?.substring(0, 500),
          digest: error?.digest,
          name: error?.name
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'error-detection',
        hypothesisId: 'E'
      })
    }).catch(() => {});
  }, [error]);
  // #endregion

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
      <p className="text-gray-600 mb-4">{error?.message || 'An unexpected error occurred'}</p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  )
}
