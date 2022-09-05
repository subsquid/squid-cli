import { getEnv } from "../../utils";

type EnvTests = [string, { name: string | undefined, value: string | undefined, isComment: boolean, isEmpty: boolean }][];

const SPACES = "   "
const COMMENT = " # some comment"

function getSpacesAndCommentsTestValues(): EnvTests {
    const values: EnvTests = []
    for (let i = 0; i < 32; i++) {
        const b = i.toString(2).padStart(5, "0");
        values.push([
            `${SPACES.repeat(Number(b[4]))}MY_ENV${SPACES.repeat(Number(b[3]))}`+
            `=${SPACES.repeat(Number(b[2]))}value${SPACES.repeat(Number(b[1]))}${COMMENT.repeat(Number(b[0]))}`, 
            {name: "MY_ENV", value: "value", isComment: false, isEmpty: false}
        ])
    }
    return values;
}

const spacesAndCommentsTests: EnvTests = getSpacesAndCommentsTestValues();
const blankLinesAndLineCommentsTests: EnvTests = [
    ["", { name: undefined, value: undefined, isComment: false, isEmpty: true}],
    ["# just a comment", { name: undefined, value: undefined, isComment: true, isEmpty: false}],
    ["               ", { name: undefined, value: undefined, isComment: false, isEmpty: true}],
]
const quotesTest: EnvTests = [
    ["MY_ENV='value with spaces'", {name: "MY_ENV", value: "value with spaces", isComment: false, isEmpty: false}],
    ['MY_ENV="value with spaces"', {name: "MY_ENV", value: "value with spaces", isComment: false, isEmpty: false}]
]

test('spaces and comments should not affect env parsing result', () => {
    spacesAndCommentsTests.forEach(v => {
        expect(getEnv(v[0])).toStrictEqual(v[1]);
    });
    blankLinesAndLineCommentsTests.forEach(v => {
        expect(getEnv(v[0])).toStrictEqual(v[1]);
    });
    quotesTest.forEach(v => {
        expect(getEnv(v[0])).toStrictEqual(v[1]);
    });
})
