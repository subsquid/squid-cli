import { SquidResponse, VersionResponse } from '../../api';

export class SquidVersion {
  name: string;

  constructor(
    public squid: SquidResponse,
    public version: VersionResponse,
  ) {
    this.name = `${this.squid.name}@${this.version.name}`;

    if (this.version.aliases.length) {
      this.name += ` (${this.version.aliases.map((a) => a.name).join(', ')})`;
    }
  }

  isHibernated() {
    return this.version.deploy.status === 'HIBERNATED';
  }

  getColor(): string | null {
    if (this.isHibernated()) {
      return 'bright-black';
    } else if (this.version.api?.status === 'NOT_AVAILABLE') {
      return 'red';
    } else if (
      this.version.addons.postgres?.disk.usageStatus === 'CRITICAL' ||
      this.version.addons.postgres?.disk.usageStatus === 'WARNING'
    ) {
      return 'yellow';
    }

    return null;
  }
}
