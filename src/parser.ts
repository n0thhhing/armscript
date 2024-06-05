import { Tokenizer, type TokenType, type Token } from './tokenizer';

export interface Declaration {
    type: string;
    value: any;
    lineNumber: number;
}

export interface LabelInstruction {
    instruction: string;
    params: Array<string | number | boolean>;
    types: string[];
    lineNumber: number;
}

export interface Label {
    lineNumber: number;
    instructions: LabelInstruction[];
}

export interface ParsedData {
    declarationNames: string[];
    declarations: { [varName: string]: Declaration };
    typeNames: string[];
    typedefs: { [typeName: string]: Declaration };
    labelNames: string[];
    labels: { [labelName: string]: Label };
}

export class Parser {
    private tokens: Token[];
    private current: number = 0;
    private undefinedLen: number = 0;
    private undefinedReferences: Token[] = [];
    private parsedData: ParsedData = {
        declarationNames: [],
        declarations: {},
        typeNames: [],
        typedefs: {},
        labelNames: [],
        labels: {},
    };

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    parse(): ParsedData {
        while (!this.isAtEnd()) {
            this.parseSection();
        }
        if (this.undefinedReferences.length > 0) {
            for (let i = 0; i < this.undefinedLen; i++) {
                const reference = this.undefinedReferences[i];
                if (
                    !this.parsedData.declarationNames.includes(
                        reference.value,
                    ) &&
                    !this.parsedData.labelNames.includes(reference.value)
                ) {
                    this.error(
                        `Reference to undefined value ${reference.value}`,
                        reference,
                    );
                }
            }
        }
        return this.parsedData;
    }

    private parseSection() {
        this.skipComments();
        this.consume('SECTION');
        this.consume('COLON');
        const sectionToken = this.consume('IDENTIFIER');
        if (sectionToken.value === 'data') {
            this.parseDataSection();
        } else if (sectionToken.value === 'text') {
            this.parseTextSection();
        } else {
            this.error(`Unexpected section: ${sectionToken.value}`);
        }
    }

    private parseDataSection() {
        while (!this.check('SECTION') && !this.isAtEnd()) {
            this.skipComments();
            if (this.match('TYPEDEF')) {
                this.parseTypedef();
            } else {
                this.parseDeclaration();
            }
        }
    }

    private parseTextSection() {
        while (!this.isAtEnd()) {
            this.skipComments();
            if (this.match('KEYWORD', 'lb')) {
                this.parseLabel();
            } else {
                this.error(
                    `Unexpected token in text section: ${this.peek().value}`,
                );
            }
        }
    }

    private parseTypedef() {
        this.skipComments();
        const typeName = this.consume('TYPENAME').value;
        this.consume('COLON');
        const type = this.consume('TYPE').value;
        this.consume('SEMICOLON');
        this.parsedData.typeNames.push(typeName);
        this.parsedData.typedefs[typeName] = {
            type,
            value: null,
            lineNumber: this.previous().line,
        };
    }

    private parseDeclaration() {
        this.skipComments();
        const varName = this.consume('IDENTIFIER').value;
        this.consume('COLON');
        const declaration: Declaration = {
            type: this.consume('TYPE').value,
            value: null,
            lineNumber: this.previous().line,
        };
        if (this.match('ASSIGN')) {
            let isValidType = false;
            const validTypes = ['STRING', 'NUMBER', 'BOOLEAN'];
            for (let i = 0; i < 3; i++) {
                if (this.check(validTypes[i])) {
                    isValidType = true;
                    declaration.value = this.advance();
                    break;
                }
            }
            if (!isValidType) this.error('unexpected value');
        }
        this.consume('SEMICOLON');
        this.parsedData.declarationNames.push(varName);
        this.parsedData.declarations[varName] = declaration;
    }

    private parseLabel() {
        this.skipComments();
        const labelName = this.consume('IDENTIFIER').value;
        this.consume('COLON');
        this.consume('BRACE_OPEN');
        const lineNumber = this.previous().line;
        const instructions: LabelInstruction[] = [];
        while (
            !this.check('KEYWORD', undefined, 'lb') &&
            !this.isAtEnd() &&
            !this.check('BRACE_CLOSE')
        ) {
            this.skipComments();
            instructions.push(this.parseInstruction());
        }
        if (this.check('BRACE_CLOSE')) this.consume('BRACE_CLOSE');
        this.parsedData.labelNames.push(labelName);
        this.parsedData.labels[labelName] = {
            lineNumber,
            instructions,
        };
    }

    private parseInstruction(): LabelInstruction {
        this.skipComments();

        const instruction = this.consume('KEYWORD').value;
        this.consume('LPAREN');

        const params: (string | number | boolean)[] = [];
        const types: string[] = [];

        while (!this.check('RPAREN') && !this.isAtEnd()) {
            this.skipComments();

            let param: string | number | boolean;
            switch (this.peek().type) {
                case 'NUMBER':
                case 'FLOAT':
                    param = parseFloat(this.consume(this.peek().type).value);
                    break;
                case 'BOOLEAN':
                    param = Boolean(this.consume('BOOLEAN').value);
                    break;
                case 'STRING':
                    param = this.consume('STRING').value.slice(1, -1);
                    break;
                case 'REGISTER':
                    param = this.consume('REGISTER').value;
                    break;
                case 'IDENTIFIER':
                    const identifier = this.consume('IDENTIFIER');
                    param = identifier.value;
                    if (
                        !this.parsedData.labelNames.includes(param) &&
                        !this.parsedData.declarationNames.includes(param)
                    ) {
                        this.undefinedReferences.push(identifier);
                        this.undefinedLen++;
                    }
                    break;
                default:
                    param = this.consume(
                        'STRING',
                        'BOOLEAN',
                        'IDENTIFIER',
                    ).value;
                    break;
            }

            params.push(param);
            types.push(this.previous().type);

            if (!this.check('RPAREN')) {
                this.consume('COMMA');
            }
        }

        const lineNumber = this.previous().line;
        this.consume('RPAREN');
        this.consume('SEMICOLON');

        return { instruction, params, types, lineNumber };
    }

    private consume(
        type: TokenType,
        or: any = undefined,
        ...values: string[]
    ): Token {
        if (this.check(type, or, ...values)) return this.advance();
        this.error(
            `Expected ${type}${values.length > 0 ? ` with value ${values.join(' or ')}` : ''} but got ${this.peek().type}`,
        );
    }

    private match(...types: any[]): boolean {
        this.skipComments();
        for (const type of types) {
            if (this.check(type)) {
                this.advance();
                return true;
            }
        }
        return false;
    }

    private check(
        type: any,
        or: any = undefined,
        ...values: string[]
    ): boolean {
        if (this.isAtEnd()) return false;
        if (!values.length) return this.peek().type === type;
        return (
            (this.peek().type === type && values.includes(this.peek().value)) ||
            (or
                ? this.peek().type === or && values.includes(this.peek().value)
                : false)
        );
    }

    private advance(): Token {
        if (!this.isAtEnd()) this.current++;
        return this.previous();
    }

    private peek(): Token {
        return this.tokens[this.current];
    }

    private previous(): Token {
        return this.tokens[this.current - 1];
    }

    private isAtEnd(): boolean {
        return this.peek().type === 'EOF';
    }

    private skipComments() {
        while (this.peek().type === 'COMMENT') {
            this.advance();
        }
    }

    private error(message: string, token?: Token): never {
        token = token || this.peek();
        throw new Error(
            `Parse Error: ${message} at line ${token.line}, column ${token.column}`,
        );
    }
}

// Example usage
const sourceCode = `.section: data
    typedef Number: int; // comment
    printedString: string = "what";
    smallNum: i8 = -128;
    byte: u8 = 255;
    shortNum: i16 = 32767;
    ushortNum: u16 = 65535;
    num: i32 = 65000;
    unsignedNum: u32 = 4294967295;
    flag: bool = true;
    bigNum: i64 = 9007199254740991;
    var_or_string: string = "str%d%d%d%s%b%b%s";
    a_string_label: string = "way";
    bool_label: bool = false;
    result: i64 = 0;
    printfStr: string = "Hello, %s";
    ending: string = "World!"; // comment
    hexnum: string = -0x8;

.section: text
    
    lb equalLabel: {
        printf(var_or_string, 1, x0, num, a_string_label, bool_label, false, "another string");
        ret();
    }
    lb notEqualLabel: {
        printf(printfStr, ending);
        ret();
    }
    lb someLabel: {
        mov(x1, 2);
        mov(x0, x1);
        print(x1);
        mov(x0, 1);
        printf(var_or_string, 1, x0, num, a_string_label, bool_label, false, "another string");
        ret();
    }
    lb start: {
        movz(x0, 0xDEF0, 0);
        movk(x0, 0x9ABC, 16);
        movk(x0, 0x5678, 32);
        movk(x0, 0x1234, 48);
        print(x0);
        print(num);
        print(printedString);
        print(flag);
        bl(someLabel);
        cmp(num, 5);
        mov(x0, 10);
        mov(x1, 20);
        add(x2, x0, x1);
        sub(x3, x2, x0);
        mul(x4, x0, x1);
        div(x5, x4, x0);
        mov(result, x2);
        print(result);
        fmov(d0, 2.5);
        fdiv(d0, d0, 0.5);
        fmul(d0, d0, 5.7);
        fsub(d0, d0, 0.1);
        fadd(d0, d0, 25.0);
        fcvtzs(x0, d0);
        print(x0);
        halt();
    }`;

try {
    const tokenizer = new Tokenizer(sourceCode);
    const tokens = tokenizer.tokenize();
    const parser = new Parser(tokens);
    const parsedData = parser.parse();
    console.log(Bun.inspect(parsedData));
} catch (e) {
    console.error(e);
}
