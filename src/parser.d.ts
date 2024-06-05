import { type Token } from './tokenizer';
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
    declarations: {
        [varName: string]: Declaration;
    };
    typeNames: string[];
    typedefs: {
        [typeName: string]: Declaration;
    };
    labelNames: string[];
    labels: {
        [labelName: string]: Label;
    };
}
export declare class Parser {
    private tokens;
    private current;
    private undefinedLen;
    private undefinedReferences;
    private parsedData;
    constructor(tokens: Token[]);
    parse(): ParsedData;
    private parseSection;
    private parseDataSection;
    private parseTextSection;
    private parseTypedef;
    private parseDeclaration;
    private parseLabel;
    private parseInstruction;
    private consume;
    private match;
    private check;
    private advance;
    private peek;
    private previous;
    private isAtEnd;
    private skipComments;
    private error;
}
