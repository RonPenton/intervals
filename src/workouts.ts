import Handlebars from 'handlebars';


function resolveOffset(value: number, offset: string | number): number {
    if (typeof offset === 'string' && offset.endsWith('%')) {
        return value * (parseFloat(offset) / 100);
    }
    return Number(offset);
}

Handlebars.registerHelper('add', function (a: number, b: number) {
    return a + b;
});

Handlebars.registerHelper('mul', function (a: number, b: number) {
    return a * b;
});

Handlebars.registerHelper('range', function (value: number, lower: string | number, upperOrOptions: string | number | Handlebars.HelperOptions, options?: Handlebars.HelperOptions) {
    const hasUpperArg = options !== undefined;
    const lowerOffset = resolveOffset(value, lower);
    const upperOffset = hasUpperArg ? resolveOffset(value, upperOrOptions as string | number) : lowerOffset;
    return `${Math.round(value - lowerOffset)}-${Math.round(value + upperOffset)}`;
});

Handlebars.registerHelper('steps', function (this: object, ...args) {
    const options = args[args.length - 1] as Handlebars.HelperOptions;
    const params = args.slice(0, -1) as number[];

    let start: number, end: number, step: number;
    if (params.length === 1) {
        start = 0; end = params[0] - 1; step = 1;
    } else if (params.length === 2) {
        start = params[0]; end = params[1]; step = 1;
    } else {
        start = params[0]; end = params[1]; step = params[2];
    }

    const name = (options.hash['name'] as string) ?? 'value';
    let result = '';
    for (let i = start; i <= end; i += step) {
        result += options.fn({ ...(this as object), [name]: i });
    }
    return result;
});
