export function padString(input: string, width: number, padCharacter = ' ') {
    let result = input;
    while (result.length < width) {
        result += padCharacter;
    }
    return result;
}
