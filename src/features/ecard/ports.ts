import type { EcardVerifyResult, EcardView } from "./types";

export interface EcardPort {
  mine(alumniId: string): EcardView;
  verify(token: string): EcardVerifyResult;
}
