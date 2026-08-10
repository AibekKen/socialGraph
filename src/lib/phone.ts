export function formatPhoneMask(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return "";
  // код страны указан явно (11 цифр, начинается на 7 или 8) — убираем его,
  // остаётся 10-значный локальный номер вида 7XX XXX-XX-XX
  if (digits.length === 11 && (digits[0] === "7" || digits[0] === "8")) {
    digits = digits.slice(1);
  }
  digits = digits.slice(0, 10);

  let out = "+7";
  if (digits.length > 0) out += " " + digits.slice(0, 3);
  if (digits.length >= 4) out += " " + digits.slice(3, 6);
  if (digits.length >= 7) out += "-" + digits.slice(6, 8);
  if (digits.length >= 9) out += "-" + digits.slice(8, 10);
  return out;
}
