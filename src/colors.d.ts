type ColorType = 'fg' | 'bg' | 'modifier';
interface ColorFunction {
    (text: string): string;
}
interface ColorMethods {
    [key: string]: ColorFunction;
}
declare class Color {
    static fg: ColorMethods;
    static modifier: ColorMethods;
    static bg: {
        rgb: (r: number, g: number, b: number) => ColorFunction;
        hex: (hex: string) => ColorFunction;
    };
    static rgb(r: number, g: number, b: number, type?: ColorType): ColorFunction;
    static hex(hex: string, type?: ColorType): ColorFunction;
}
export default Color;
