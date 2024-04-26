import chalk from 'chalk';
import blessed, { Element } from 'reblessed';

import { chalkMainColor, scrollBarTheme } from '../theme';

import { VersionTab } from './Tabs';
import { Squid } from './types';

export class VersionDbAccessTab implements VersionTab {
  async append(parent: Element, squid: Squid) {
    const lines = [];

    const db = squid.addons?.postgres || squid.addons?.neon;

    const connection = db?.connections?.[0];
    if (connection) {
      lines.push(chalkMainColor(`URL`));
      lines.push(connection.params.host);
      lines.push('');

      lines.push(chalkMainColor(`DB`));
      lines.push(connection.params.database);
      lines.push('');

      lines.push(chalkMainColor(`User`));
      lines.push(connection.params.user);
      lines.push('');

      lines.push(chalkMainColor(`Password`));
      lines.push(connection.params.password);
      lines.push('');
      lines.push('');

      lines.push(chalkMainColor(`PSQL command`));
      lines.push(
        chalk.bgBlackBright(
          `PGPASSWORD=${connection.params.password} psql -h ${connection.params.host} -d ${connection.params.database} -U ${connection.params.user}`,
        ),
      );
      lines.push('');
    }

    parent.append(
      blessed.box({
        content: lines.join('\n'),
        scrollable: true,
        mouse: true,
        scrollbar: scrollBarTheme,
      }),
    );
  }
}
