import type { Locale } from "../config";
import ru from "./ru";
import kk from "./kk";
import en from "./en";

export const dictionaries: Record<Locale, typeof ru> = { ru, kk, en };
