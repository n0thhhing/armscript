export type TokenType =
    | 'SECTION'
    | 'IDENTIFIER'
    | 'TYPE'
    | 'ASSIGN'
    | 'NUMBER'
    | 'STRING'
    | 'FLOAT'
    | 'BOOLEAN'
    | 'KEYWORD'
    | 'COLON'
    | 'SEMICOLON'
    | 'BRACE_OPEN'
    | 'BRACE_CLOSE'
    | 'LPAREN'
    | 'RPAREN'
    | 'COMMA'
    | 'MINUS'
    | 'COMMENT'
    | 'TYPEDEF'
    | 'TYPENAME'
    | 'REGISTER'
    | 'EOF';

export interface Token {
    type: TokenType;
    value: string;
    line: number;
    column: number;
}

export class TokenizerError extends Error {
    constructor(
        message: string,
        public line: number,
        public column: number,
        public codeSnippet: string,
    ) {
        super(message);
        this.name = 'TokenizerError';
    }

    toString() {
        return `${this.name}: ${this.message} (at line ${this.line}, column ${this.column})\nCode Snippet:\n${this.codeSnippet}\n${this.stack}`;
    }
}

export class Tokenizer {
    private input: string;
    private current = 0;
    private line = 1;
    private column = 1;
    private prevToken = '';

    private keywords = new Set([
        'section',
        'halt',
        'typedef',
        'lb',
        'movz',
        'movk',
        'fmov',
        'mov',
        'print',
        'bl',
        'cmp',
        'add',
        'fadd',
        'sub',
        'fsub',
        'mul',
        'fmul',
        'div',
        'fdiv',
        'ret',
        'printf',
        'fcvtzs',
    ]);
    private types = new Set([
        'int',
        'string',
        'i8',
        'u8',
        'i16',
        'u16',
        'i32',
        'u32',
        'bool',
        'i64',
    ]);
    private registers = new Set([
        'x0',
        'w0',
        'x1',
        'w1',
        'x2',
        'w2',
        'x3',
        'w3',
        'x4',
        'w4',
        'x5',
        'w5',
        'x6',
        'w6',
        'x7',
        'w7',
        'x8',
        'w8',
        'x9',
        'w9',
        'x10',
        'w10',
        'x11',
        'w11',
        'x12',
        'w12',
        'x13',
        'w13',
        'x14',
        'w14',
        'x15',
        'w15',
        'x16',
        'w16',
        'x17',
        'w17',
        'x18',
        'w18',
        'x19',
        'w19',
        'x20',
        'w20',
        'x21',
        'w21',
        'x22',
        'w22',
        'x23',
        'w23',
        'x24',
        'w24',
        'x25',
        'w25',
        'x26',
        'w26',
        'x27',
        'w27',
        'x28',
        'w28',
        'x29',
        'w29',
        'x30',
        'w30',
        'x31',
        'w31',
        's0',
        's1',
        's2',
        's3',
        's4',
        's5',
        's6',
        's7',
        's8',
        's9',
        's10',
        's11',
        's12',
        's13',
        's14',
        's15',
        's16',
        's17',
        's18',
        's19',
        's20',
        's21',
        's22',
        's23',
        's24',
        's25',
        's26',
        's27',
        's28',
        's29',
        's30',
        's31',
        'd0',
        'd1',
        'd2',
        'd3',
        'd4',
        'd5',
        'd6',
        'd7',
        'd8',
        'd9',
        'd10',
        'd11',
        'd12',
        'd13',
        'd14',
        'd15',
        'd16',
        'd17',
        'd18',
        'd19',
        'd20',
        'd21',
        'd22',
        'd23',
        'd24',
        'd25',
        'd26',
        'd27',
        'd28',
        'd29',
        'd30',
        'd31',
    ]);

    constructor(input: string) {
        this.input = input;
    }

    tokenize(): Token[] {
        const tokens: Token[] = [];
        while (!this.isAtEnd()) {
            const char = this.advance();
            if (this.isWhitespace(char)) {
                this.skipWhitespace(char);
                continue;
            }

            try {
                let prevToken;
                if (char === '/' && this.peek() === '/') {
                    const token = this.comsumeComment();
                    prevToken = token.value;
                    tokens.push(token);
                } else if (char === '.') {
                    const token = this.consumeSection();
                    prevToken = token.value;
                    tokens.push(token);
                } else if (char.match(/[a-zA-Z_]/)) {
                    const token = this.consumeIdentifierOrKeyword();
                    prevToken = token.value;
                    tokens.push(token);
                } else if (
                    char.match(/[0-9]/) ||
                    (char === '-' && this.peek().match(/[0-9]/))
                ) {
                    const token = this.consumeNumber(char);
                    prevToken = token.value;
                    tokens.push(token);
                } else if (char === '"') {
                    const token = this.consumeString();
                    prevToken = token.value;
                    tokens.push(token);
                } else if (char === ':') {
                    prevToken = char;
                    tokens.push(this.createToken('COLON', char));
                } else if (char === ';') {
                    prevToken = char;
                    tokens.push(this.createToken('SEMICOLON', char));
                } else if (char === '{') {
                    prevToken = char;
                    tokens.push(this.createToken('BRACE_OPEN', char));
                } else if (char === '}') {
                    prevToken = char;
                    tokens.push(this.createToken('BRACE_CLOSE', char));
                } else if (char === '(') {
                    prevToken = char;
                    tokens.push(this.createToken('LPAREN', char));
                } else if (char === ')') {
                    prevToken = char;
                    tokens.push(this.createToken('RPAREN', char));
                } else if (char === ',') {
                    prevToken = char;
                    tokens.push(this.createToken('COMMA', char));
                } else if (char === '=') {
                    prevToken = char;
                    tokens.push(this.createToken('ASSIGN', char));
                } else {
                    this.error(`Unexpected character: '${char}'`);
                }
                this.prevToken = prevToken;
            } catch (e) {
                if (e instanceof TokenizerError) {
                    console.error(e.toString());
                    process.exit(1);
                } else {
                    throw e;
                }
            }
        }
        tokens.push(this.createToken('EOF', ''));
        return tokens;
    }

    private createToken(type: TokenType, value: string): Token {
        return { type, value, line: this.line, column: this.column };
    }

    private consumeSection(): Token {
        let value = '.';
        while (this.peek().match(/[a-zA-Z]/)) {
            value += this.advance();
        }
        return this.createToken('SECTION', value);
    }

    private consumeIdentifierOrKeyword(): Token {
        let value = this.input[this.current - 1];
        while (this.peek().match(/[a-zA-Z_0-9]/)) {
            value += this.advance();
        }
        if (value === 'typedef') {
            return this.createToken('TYPEDEF', value);
        } else if (this.prevToken === 'typedef') {
            return this.createToken('TYPENAME', value);
        } else if (value === 'true' || value === 'false') {
            return this.createToken('BOOLEAN', value);
        } else if (this.keywords.has(value)) {
            return this.createToken('KEYWORD', value);
        } else if (this.registers.has(value)) {
            return this.createToken('REGISTER', value);
        } else if (this.types.has(value)) {
            return this.createToken('TYPE', value);
        }
        return this.createToken('IDENTIFIER', value);
    }

    private consumeNumber(initialChar: string): Token {
        let value = initialChar;
        let isFloat = false; // Flag to track if it's a float

        // Check for negative numbers
        if (initialChar === '-' && this.peek().match(/[0-9]/)) {
            value += this.advance();
            if (this.peek() === 'x') {
                this.column += 2;
                value += this.advance();
                value += this.advance();
            }
            while (this.peek().match(/[0-9]/)) {
                this.column++;
                value += this.advance();
            }
            return this.createToken('NUMBER', value);
        }

        // Check for hexadecimal numbers
        if (
            initialChar === '0' &&
            (this.peek() === 'x' || this.peek() === 'X')
        ) {
            value += this.advance(); // Consume 'x' or 'X'
            while (this.peek().match(/[0-9a-fA-F]/)) {
                // Allow hexadecimal digits
                this.column++;
                value += this.advance();
            }
        } else {
            while (
                this.peek().match(/[0-9]/) ||
                (!isFloat && this.peek() === '.')
            ) {
                // Consume decimal digits and '.' if it's not already a float
                if (this.peek() === '.') {
                    isFloat = true;
                }
                this.column++;
                value += this.advance();
            }
        }

        return this.createToken(isFloat ? 'FLOAT' : 'NUMBER', value); // Use 'FLOAT' if it's a float
    }

    private consumeString(): Token {
        let value = '"';
        while (this.peek() !== '"' && !this.isAtEnd()) {
            value += this.advance();
            this.column++;
        }
        if (this.isAtEnd()) {
            this.error('Unterminated string.');
        }
        value += this.advance();
        this.column++;
        return this.createToken('STRING', value);
    }

    private comsumeComment(): Token {
        let comment = '';
        this.advance();
        while (this.peek() !== '\n' && !this.isAtEnd()) {
            comment += this.advance();
            this.line++;
            this.column = 1;
        }
        return this.createToken('COMMENT', comment.trim());
    }

    private skipWhitespace(char: string) {
        if (char === '\n') {
            this.line++;
            this.column = 1;
        } else {
            this.column++;
        }
    }

    private isWhitespace(char: string) {
        return char === ' ' || char === '\t' || char === '\n' || char === '\r';
    }

    private advance(): string {
        return this.input[this.current++];
    }

    private peek(index: number = 0): string {
        if (this.isAtEnd()) return '\0';
        return this.input[this.current];
    }

    private isAtEnd(): boolean {
        return this.current >= this.input.length;
    }

    private error(message: string): never {
        const snippet = this.input.slice(this.current - 10, this.current + 10);
        throw new TokenizerError(message, this.line, this.column, snippet);
    }
}
