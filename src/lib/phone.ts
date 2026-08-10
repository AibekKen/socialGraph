export function formatPhoneMask(raw: string): string {
  let digits: string;

  if (raw.startsWith("+7")) {
    // поле уже показывает наш префикс "+7" — отрезаем его текстом, а не
    // цифрой, иначе при каждом вводе "7" из префикса считалась бы ещё раз
    // как цифра номера (отсюда дублирование и невозможность стереть до конца)
    digits = raw.slice(2).replace(/\D/g, "");
  } else {
    digits = raw.replace(/\D/g, "");
    // код страны указан явно без "+" (11 цифр, начинается на 7 или 8) —
    // убираем его, остаётся 10-значный локальный номер вида 7XX XXX-XX-XX
    if (digits.length === 11 && (digits[0] === "7" || digits[0] === "8")) {
      digits = digits.slice(1);
    }
  }

  digits = digits.slice(0, 10);
  if (digits.length === 0) return "";

  let out = "+7";
  out += " " + digits.slice(0, 3);
  if (digits.length >= 4) out += " " + digits.slice(3, 6);
  if (digits.length >= 7) out += "-" + digits.slice(6, 8);
  if (digits.length >= 9) out += "-" + digits.slice(8, 10);
  return out;
}
