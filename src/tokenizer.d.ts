export type TokenType = 'SECTION' | 'IDENTIFIER' | 'TYPE' | 'ASSIGN' | 'NUMBER' | 'STRING' | 'FLOAT' | 'BOOLEAN' | 'KEYWORD' | 'COLON' | 'SEMICOLON' | 'BRACE_OPEN' | 'BRACE_CLOSE' | 'LPAREN' | 'RPAREN' | 'COMMA' | 'MINUS' | 'COMMENT' | 'TYPEDEF' | 'TYPENAME' | 'REGISTER' | 'EOF';
export interface Token {
    type: TokenType;
    value: string;
    line: number;
    column: number;
}
export declare class TokenizerError extends Error {
    line: number;
    column: number;
    codeSnippet: string;
    constructor(message: string, line: number, column: number, codeSnippet: string);
    toString(): string;
}
export declare class Tokenizer {
    private input;
    private current;
    private line;
    private column;
    private prevToken;
    private keywords;
    private types;
    private registers;
    constructor(input: string);
    tokenize(): Token[];
    private createToken;
    private consumeSection;
    private consumeIdentifierOrKeyword;
    private consumeNumber;
    private consumeString;
    private comsumeComment;
    private skipWhitespace;
    private isWhitespace;
    private advance;
    private peek;
    private isAtEnd;
    private error;
}
