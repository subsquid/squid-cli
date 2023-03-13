import chalk from 'chalk';
import blessed, { Element } from 'reblessed';

import { chalkMainColor } from '../theme';

import { VersionTab } from './Tabs';
import { SquidVersion } from './types';

export class VersionDbAccessTab implements VersionTab {
  async append(parent: Element, squid: SquidVersion) {
    const lines = [];

    lines.push(chalkMainColor(`URL`));
    lines.push(squid.version.db.ingress.url);
    lines.push('');

    lines.push(chalkMainColor(`DB`));
    lines.push(squid.version.db.ingress.db);
    lines.push('');

    lines.push(chalkMainColor(`User`));
    lines.push(squid.version.db.ingress.user);
    lines.push('');

    lines.push(chalkMainColor(`Password`));
    lines.push(squid.version.db.ingress.password);
    lines.push('');
    lines.push('');

    lines.push(chalkMainColor(`PSQL command`));
    lines.push(
      chalk.bgBlackBright(
        `PGPASSWORD=${squid.version.db.ingress.password} pqsl -h ${squid.version.db.ingress.url} -d ${squid.version.db.ingress.db} -U ${squid.version.db.ingress.user}`,
      ),
    );
    lines.push('');

    parent.append(
      blessed.box({
        content: lines.join('\n'),
      }),
    );
  }
}
