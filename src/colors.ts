enum Foreground {
    Black = '\x1b[30m',
    Red = '\x1b[31m',
    Green = '\x1b[32m',
    Yellow = '\x1b[33m',
    Blue = '\x1b[34m',
    Magenta = '\x1b[35m',
    Cyan = '\x1b[36m',
    White = '\x1b[37m',
    BrightBlack = '\x1b[90m',
    BrightRed = '\x1b[91m',
    BrightGreen = '\x1b[92m',
    BrightYellow = '\x1b[93m',
    BrightBlue = '\x1b[94m',
    BrightMagenta = '\x1b[95m',
    BrightCyan = '\x1b[96m',
    BrightWhite = '\x1b[97m',
    Grey = '\x1b[90m',
    Gray = '\x1b[90m',
    LightGray = '\x1b[38;5;248m',
    DarkGray = '\x1b[38;5;240m',
    Brown = '\x1b[38;5;130m',
    Olive = '\x1b[38;5;58m',
    Navy = '\x1b[38;5;18m',
}

enum Background {
    Black = '\x1b[40m',
    Red = '\x1b[41m',
    Green = '\x1b[42m',
    Yellow = '\x1b[43m',
    Blue = '\x1b[44m',
    Magenta = '\x1b[45m',
    Cyan = '\x1b[46m',
    White = '\x1b[47m',
    BrightBlack = '\x1b[100m',
    BrightRed = '\x1b[101m',
    BrightGreen = '\x1b[102m',
    BrightYellow = '\x1b[103m',
    BrightBlue = '\x1b[104m',
    BrightMagenta = '\x1b[105m',
    BrightCyan = '\x1b[106m',
    BrightWhite = '\x1b[107m',
    LightGray = '\x1b[48;5;248m',
    DarkGray = '\x1b[48;5;240m',
    Brown = '\x1b[48;5;130m',
    Olive = '\x1b[48;5;58m',
    Navy = '\x1b[48;5;18m',
}

enum Modifiers {
    Reset = '\x1b[0m',
    Bold = '\x1b[1m',
    Dim = '\x1b[2m',
    Italic = '\x1b[3m',
    Underline = '\x1b[4m',
    Blink = '\x1b[5m',
    Reverse = '\x1b[7m',
    Hidden = '\x1b[8m',
}

enum ColorError {
    InvalidHexFormat = 'Invalid hex color format',
    InvalidColorType = 'Invalid color type',
}

type Modifier = Modifiers;
type ColorType = 'fg' | 'bg' | 'modifier';

interface RGBColor {
    r: number;
    g: number;
    b: number;
}

interface ColorFunction {
    (text: string): string;
}

interface ColorMethods {
    [key: string]: ColorFunction;
}

interface ColorObject {
    [key: string]: ColorMethods;
}

function methodBuilder(colorType: ColorType, colorEnum: any): ColorMethods {
    const methods: ColorMethods = {};

    Object.keys(colorEnum).forEach((key) => {
        const colorCode = colorEnum[key];
        methods[key] = (text: string | number) => {
            if (typeof text === 'number') text = text.toString();

            const resetCode = Modifiers.Reset;
            let result = '';
            let lastIndex = 0;

            while (true) {
                const resetIndex = text.indexOf(resetCode, lastIndex);
                if (resetIndex === -1) {
                    result += `${colorCode}${text.slice(lastIndex)}${resetCode}`;
                    break;
                }

                result += `${colorCode}${text.slice(lastIndex, resetIndex)}${resetCode}${colorCode}`;
                lastIndex = resetIndex + resetCode.length;
            }

            return result;
        };
    });

    return methods;
}

function hexToRgb(hex: string): RGBColor {
    const regexResult = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!regexResult) {
        throw new Error(ColorError.InvalidHexFormat);
    }
    const [, r, g, b] = regexResult.map((x) => parseInt(x, 16));
    if (
        isNaN(r) ||
        isNaN(g) ||
        isNaN(b) ||
        r < 0 ||
        r > 255 ||
        g < 0 ||
        g > 255 ||
        b < 0 ||
        b > 255
    ) {
        throw new Error(ColorError.InvalidHexFormat);
    }
    return { r, g, b };
}

class Color {
    static fg = methodBuilder('fg', Foreground);
    static modifier = methodBuilder('modifier', Modifiers);

    static bg = {
        ...methodBuilder('bg', Background),
        rgb: (r: number, g: number, b: number) => Color.rgb(r, g, b, 'bg'),
        hex: (hex: string) => Color.hex(hex, 'bg'),
    };

    static rgb(
        r: number,
        g: number,
        b: number,
        type: ColorType = 'fg',
    ): ColorFunction {
        if (r < 0 || r > 255 || g < 0 || b < 0 || b > 255) {
            throw new Error(ColorError.InvalidColorType);
        }
        const colorCode =
            type === 'fg'
                ? `\x1b[38;2;${r};${g};${b}m`
                : `\x1b[48;2;${r};${g};${b}m`;
        return (text: string) => `${colorCode}${text}${Modifiers.Reset}`;
    }

    static hex(hex: string, type: ColorType = 'fg'): ColorFunction {
        const { r, g, b } = hexToRgb(hex);
        return Color.rgb(r, g, b, type);
    }
}

export default Color;
