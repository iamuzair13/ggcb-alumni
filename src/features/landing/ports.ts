/** Landing is static — the only port answers "is there a session?". */
export interface LandingPort {
  isSignedIn(): boolean;
}
