import { Flags } from '@oclif/core';

import { squidCreate } from '../api';
import { CliCommand, RELEASE_DEPRECATE } from '../command';

export default class Create extends CliCommand {
  static aliases = ['squid:create'];
  static hidden = true;

  static description = 'Create a squid';

  static args = [
    {
      name: 'name',
      description: 'squid name',
      required: true,
    },
  ];

  static flags = {
    description: Flags.string({
      char: 'd',
      description: 'description',
      required: false,
    }),
    logo: Flags.string({
      char: 'l',
      description: 'logo url',
      required: false,
    }),
    website: Flags.string({
      char: 'w',
      description: 'website url',
      required: false,
    }),
  };

  async run(): Promise<void> {
    this.log(RELEASE_DEPRECATE);

    const { flags, args } = await this.parse(Create);
    const name = args.name;
    const description = flags.description;
    const logoUrl = flags.logo;
    const websiteUrl = flags.website;

    const responseBody = await squidCreate(name, description, logoUrl, websiteUrl);
    this.log(`Created squid with name "${responseBody.name}"`);
  }
}
