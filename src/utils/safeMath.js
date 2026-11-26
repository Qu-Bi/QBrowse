const MAX_EXPR_LENGTH = 200;
const MAX_RECURSION_DEPTH = 32;

/**
 * Safely evaluate a basic arithmetic expression without using eval or new Function.
 * Supports +, -, *, /, unary +/-, parentheses (...), integers, and decimal numbers.
 *
 * @param {string} expr
 * @returns {number | null}
 */
export function safeEvalMath(expr) {
    if (typeof expr !== 'string') return null;
    const input = expr.trim();
    if (!input || input.length > MAX_EXPR_LENGTH) return null;

    let pos = 0;

    function skipWhitespace() {
        while (pos < input.length && /\s/.test(input[pos])) {
            pos++;
        }
    }

    function parseExpression(depth) {
        if (depth > MAX_RECURSION_DEPTH) {
            throw new Error('Max recursion depth exceeded');
        }
        let left = parseTerm(depth + 1);
        while (true) {
            skipWhitespace();
            const ch = input[pos];
            if (ch === '+' || ch === '-') {
                pos++;
                const right = parseTerm(depth + 1);
                left = ch === '+' ? left + right : left - right;
            } else {
                break;
            }
        }
        return left;
    }

    function parseTerm(depth) {
        if (depth > MAX_RECURSION_DEPTH) {
            throw new Error('Max recursion depth exceeded');
        }
        let left = parseFactor(depth + 1);
        while (true) {
            skipWhitespace();
            const ch = input[pos];
            if (ch === '*' || ch === '/') {
                pos++;
                const right = parseFactor(depth + 1);
                left = ch === '*' ? left * right : left / right;
            } else {
                break;
            }
        }
        return left;
    }

    function parseFactor(depth) {
        if (depth > MAX_RECURSION_DEPTH) {
            throw new Error('Max recursion depth exceeded');
        }
        skipWhitespace();
        const ch = input[pos];
        if (ch === '+' || ch === '-') {
            pos++;
            const val = parseFactor(depth + 1);
            return ch === '-' ? -val : val;
        }
        return parsePrimary(depth + 1);
    }

    function parsePrimary(depth) {
        if (depth > MAX_RECURSION_DEPTH) {
            throw new Error('Max recursion depth exceeded');
        }
        skipWhitespace();
        if (input[pos] === '(') {
            pos++;
            const val = parseExpression(depth + 1);
            skipWhitespace();
            if (input[pos] !== ')') {
                throw new Error('Unbalanced parentheses');
            }
            pos++;
            return val;
        }
        return parseNumber();
    }

    function parseNumber() {
        skipWhitespace();
        const start = pos;
        let hasDigits = false;
        let hasDot = false;

        while (pos < input.length) {
            const ch = input[pos];
            if (ch >= '0' && ch <= '9') {
                hasDigits = true;
                pos++;
            } else if (ch === '.' && !hasDot) {
                hasDot = true;
                pos++;
            } else {
                break;
            }
        }

        if (!hasDigits) {
            throw new Error('Expected number');
        }

        const num = Number(input.slice(start, pos));
        if (!Number.isFinite(num)) {
            throw new Error('Invalid number');
        }
        return num;
    }

    try {
        const result = parseExpression(0);
        skipWhitespace();
        if (pos !== input.length) {
            return null;
        }
        return typeof result === 'number' && Number.isFinite(result) ? result : null;
    } catch {
        return null;
    }
}
