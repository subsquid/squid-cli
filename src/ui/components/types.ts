import { Squid as ApiSquid } from '../../api';
import { formatSquidReference } from '../../utils';

export interface Squid extends ApiSquid {}
export class Squid {
  readonly displayName: string;

  constructor(squid: ApiSquid) {
    Object.assign(this, squid);

    this.displayName = formatSquidReference({ name: this.name, slot: this.slot });

    if (this.tags.length) {
      this.displayName += ` (${this.tags.map((a) => a.name).join(', ')})`;
    }
  }

  isHibernated() {
    return this.status === 'HIBERNATED';
  }

  getColor(): string | null {
    if (this.isHibernated()) {
      return 'bright-black';
    } else if (this.api?.status === 'NOT_AVAILABLE') {
      return 'red';
    } else if (
      this.addons?.postgres?.disk.usageStatus === 'CRITICAL' ||
      this.addons?.postgres?.disk.usageStatus === 'WARNING'
    ) {
      return 'yellow';
    }

    return null;
  }
}
