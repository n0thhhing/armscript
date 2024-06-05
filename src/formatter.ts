import { Token, Tokenizer } from './tokenizer';

class Formatter {
    public indentation: number;

    constructor(indentationLevel: number) {
        this.indentation = indentationLevel;
    }

    public format(input: string): string {
        const tokenizer = new Tokenizer(input);
        const tokens = tokenizer.tokenize();
        let formattedCode = '';
        let currentSection = '';
        let indentLevel = 0;

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            switch (token.type) {
                case 'SECTION':
                    if (tokens[i + 2].value === 'text') indentLevel--;
                    formattedCode += `\n${token.value}${tokens[i + 1].value} ${tokens[i + 2].value}\n`;
                    currentSection = tokens[i + 2].value;
                    i += 2;
                    indentLevel++;
                    break;
                case 'TYPEDEF':
                case 'KEYWORD':
                    formattedCode += `${this.indent(indentLevel)}${token.value} `;
                    break;
                case 'IDENTIFIER':
                    formattedCode +=
                        currentSection === 'data'
                            ? `${this.indent(indentLevel)}${token.value}`
                            : token.value;
                    break;
                case 'ASSIGN':
                case 'NUMBER':
                case 'STRING':
                case 'FLOAT':
                case 'BOOLEAN':
                case 'REGISTER':
                case 'TYPE':
                case 'TYPENAME':
                    formattedCode += token.value;
                    break;
                case 'SEMICOLON':
                    formattedCode += ';\n';
                    break;
                case 'BRACE_OPEN':
                    formattedCode += `{\n`;
                    indentLevel++;
                    break;
                case 'BRACE_CLOSE':
                    indentLevel--;
                    formattedCode += `${this.indent(indentLevel)}}\n\n`;
                    break;
                case 'LPAREN':
                    formattedCode += '(';
                    break;
                case 'RPAREN':
                    formattedCode += ')';
                    break;
                case 'COMMA':
                    formattedCode += ', ';
                    break;
                case 'COLON':
                    formattedCode += ': ';
                    break;
                case 'COMMENT':
                    formattedCode = formattedCode.slice(0, -1);
                    formattedCode += ` // ${token.value}\n`;
                    break;
            }
        }

        return formattedCode;
    }

    private indent(indentLevel: number): string {
        return ' '.repeat(this.indentation).repeat(indentLevel);
    }
}

// Example usage:
const input = `.section: data
    typedef Number: int;
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
    ending: string = "World!";
    hexnum: string = -0x8; // comment

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
        halt(0); // exit code 0
    }`;

const formatter = new Formatter(4);
const formattedCode = formatter.format(input);
console.log(formattedCode);
