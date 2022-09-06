import { writeFileSync, unlinkSync } from 'fs';

import { getEnv, parseEnvs } from '../../utils';

type EnvTests = [string, Record<string, string>][];

const SPACES = '   ';
const COMMENT = ' # some comment';

function getSpacesAndCommentsTestValues(): EnvTests {
  const values: EnvTests = [];
  for (let i = 0; i < 32; i++) {
    const b = i.toString(2).padStart(5, '0');
    values.push([
      `${SPACES.repeat(Number(b[4]))}MY_ENV${SPACES.repeat(Number(b[3]))}` +
        `=${SPACES.repeat(Number(b[2]))}value${SPACES.repeat(Number(b[1]))}${COMMENT.repeat(Number(b[0]))}`,
      { MY_ENV: 'value' },
    ]);
  }
  return values;
}

const spacesAndCommentsTests: EnvTests = getSpacesAndCommentsTestValues();
const quotesTest: EnvTests = [
  ["MY_ENV='value with spaces'", { MY_ENV: 'value with spaces' }],
  ['MY_ENV="value with spaces"', { MY_ENV: 'value with spaces' }],
];

test('spaces and comments should not affect the env parsing result', () => {
  spacesAndCommentsTests.forEach((v) => {
    expect(getEnv(v[0])).toStrictEqual(v[1]);
  });
});

test('quotes must define the boundaries of the env value', () => {
  quotesTest.forEach((v) => {
    expect(getEnv(v[0])).toStrictEqual(v[1]);
  });
});

test('env values must parse from file and merge', () => {
  const PATH_TO_TEST_FILE = '.env.unit-test';
  const testValues =
    'MY_ENV_1=value_1\n MY_ENV_2 = value_2 \nMY_ENV_3	=	value_3\nMY_ENV_4	=	value_4\n\n#comment\nMY_ENV_5=value_5 #comment';
  const testResults: Record<string, string> = {
    MY_ENV_1: 'value_1',
    MY_ENV_2: 'value_2',
    MY_ENV_3: 'value_3',
    MY_ENV_4: 'value_4',
    MY_ENV_5: 'value_5',
  };
  const mergeTestValues: string[] = ['MY_ENV=value'];
  const mergeTestResults: Record<string, string> = {
    ...testResults,
    MY_ENV: 'value',
  };
  writeFileSync(PATH_TO_TEST_FILE, testValues);
  const results = parseEnvs(undefined, PATH_TO_TEST_FILE);
  const mergeResults = parseEnvs(mergeTestValues, PATH_TO_TEST_FILE);
  unlinkSync(PATH_TO_TEST_FILE);
  expect(results).toStrictEqual(testResults);
  expect(mergeResults).toStrictEqual(mergeTestResults);
});
