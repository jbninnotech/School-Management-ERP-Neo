/**
 * Safe Mathematical Expression Evaluator
 * Evaluates mathematical expressions using recursive descent without ever calling eval() or Function().
 * Supports: +, -, *, /, %, ^, sqrt, parenthesis, unary minus, decimals.
 */
export function evaluateMathExpression(expr) {
  if (!expr || typeof expr !== 'string') return '';
  const clean = expr.trim();
  if (!clean) return '';

  let pos = 0;
  let ch = clean.charAt(0);

  function nextChar() {
    pos++;
    ch = pos < clean.length ? clean.charAt(pos) : '';
  }

  function eat(charToEat) {
    while (ch === ' ') nextChar();
    if (ch === charToEat) {
      nextChar();
      return true;
    }
    return false;
  }

  function parseExpression() {
    let x = parseTerm();
    for (;;) {
      if (eat('+')) x += parseTerm();
      else if (eat('-')) x -= parseTerm();
      else return x;
    }
  }

  function parseTerm() {
    let x = parseFactor();
    for (;;) {
      if (eat('*') || eat('x') || eat('X')) x *= parseFactor();
      else if (eat('/')) {
        const divisor = parseFactor();
        if (divisor === 0) throw new Error('Cannot divide by zero');
        x /= divisor;
      } else if (eat('%')) {
        x %= parseFactor();
      } else return x;
    }
  }

  function parseFactor() {
    if (eat('+')) return +parseFactor(); // unary plus
    if (eat('-')) return -parseFactor(); // unary minus

    let x;
    const startPos = pos;
    if (eat('(')) {
      x = parseExpression();
      if (!eat(')')) throw new Error('Missing closing parenthesis');
    } else if ((ch >= '0' && ch <= '9') || ch === '.') {
      while ((ch >= '0' && ch <= '9') || ch === '.') nextChar();
      const numStr = clean.substring(startPos, pos);
      x = parseFloat(numStr);
      if (isNaN(x)) throw new Error(`Invalid number "${numStr}"`);
    } else if (clean.substring(pos).startsWith('sqrt')) {
      pos += 4;
      ch = pos < clean.length ? clean.charAt(pos) : '';
      const arg = parseFactor();
      if (arg < 0) throw new Error('Square root of negative number');
      x = Math.sqrt(arg);
    } else if (clean.substring(pos).startsWith('sin')) {
      pos += 3;
      ch = pos < clean.length ? clean.charAt(pos) : '';
      x = Math.sin((parseFactor() * Math.PI) / 180);
    } else if (clean.substring(pos).startsWith('cos')) {
      pos += 3;
      ch = pos < clean.length ? clean.charAt(pos) : '';
      x = Math.cos((parseFactor() * Math.PI) / 180);
    } else if (clean.substring(pos).startsWith('tan')) {
      pos += 3;
      ch = pos < clean.length ? clean.charAt(pos) : '';
      x = Math.tan((parseFactor() * Math.PI) / 180);
    } else if (clean.substring(pos).startsWith('log')) {
      pos += 3;
      ch = pos < clean.length ? clean.charAt(pos) : '';
      const arg = parseFactor();
      if (arg <= 0) throw new Error('Logarithm of non-positive number');
      x = Math.log10(arg);
    } else if (clean.substring(pos).startsWith('ln')) {
      pos += 2;
      ch = pos < clean.length ? clean.charAt(pos) : '';
      const arg = parseFactor();
      if (arg <= 0) throw new Error('Natural log of non-positive number');
      x = Math.log(arg);
    } else if (clean.substring(pos).startsWith('pi')) {
      pos += 2;
      ch = pos < clean.length ? clean.charAt(pos) : '';
      x = Math.PI;
    } else {
      throw new Error(`Unexpected character "${ch}" at index ${pos}`);
    }

    if (eat('^')) {
      const power = parseFactor();
      x = Math.pow(x, power);
    }

    return x;
  }

  const result = parseExpression();
  if (pos < clean.length) {
    throw new Error(`Unexpected trailing character "${ch}"`);
  }
  return Number.isFinite(result) ? Number(result.toFixed(8)) : result;
}
