// Reader-facing error sentences, shared by the API routes and the browser
// (kept free of server imports so client code can use it).
export const ERROR_TEXT = {
  timeout: 'This search took too long. Try a longer or more specific query, or narrow the filters.',
  unavailable: "Search isn't available right now. Please try again in a moment.",
} as const;
