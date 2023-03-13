import chalk from 'chalk';

export const mainColor = 'blue';
export const chalkMainColor = chalk.blue;

export const defaultBoxTheme = {
  tags: true,
  border: {
    type: 'line',
  },
  style: {
    border: {
      fg: mainColor,
    },
    focus: {
      border: {
        fg: mainColor,
      },
    },
  },
};
