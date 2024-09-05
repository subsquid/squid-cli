import { Args, Flags } from '@oclif/core';
import chalk from 'chalk';
import inquirer from 'inquirer';

import { tagSquid } from '../../api';
import { SqdFlags } from '../../command';
import { DeployCommand } from '../../deploy-command';
import { formatSquidFullname } from '../../utils';
import { UPDATE_COLOR } from '../deploy';

export default class Add extends DeployCommand {
  static description = 'Add a tag to a squid';

  static args = {
    tag: Args.string({
      description: `New tag to assign`,
      required: true,
    }),
  };

  static flags = {
    org: SqdFlags.org({
      required: false,
      relationships: [
        {
          type: 'all',
          flags: ['name'],
        },
        {
          type: 'some',
          flags: [
            { name: 'ref', when: async (flags) => !flags['tag'] },
            { name: 'tag', when: async (flags) => !flags['ref'] },
          ],
        },
      ],
    }),
    name: SqdFlags.name({
      required: false,
      relationships: [
        {
          type: 'some',
          flags: [
            { name: 'ref', when: async (flags) => !flags['tag'] },
            { name: 'tag', when: async (flags) => !flags['ref'] },
          ],
        },
      ],
    }),
    ref: SqdFlags.ref({
      required: false,
      dependsOn: ['name'],
    }),
    tag: SqdFlags.tag({
      required: false,
      dependsOn: ['name'],
      exclusive: ['ref'],
    }),
    fullname: SqdFlags.fullname({
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {
      args: { tag: newTag },
      flags: { fullname, ...flags },
    } = await this.parse(Add);

    this.validateSquidNameFlags({ fullname, ...flags });

    const { org, name, tag, ref } = fullname ? fullname : (flags as any);
    const reference = formatSquidFullname({ name, ref, tag });

    const organization = await this.promptSquidOrganization({ code: org, name });
    const squid = await this.findOrThrowSquid({ organization, reference });

    if (squid.tags.find((t) => t.name === tag)) {
      return this.log(`Tag "${tag}" is already assigned to the squid ${formatSquidFullname({ org, name, tag, ref })}`);
    }

    const oldSquid = await this.findSquid({ organization, reference: formatSquidFullname({ name, tag: newTag }) });
    if (oldSquid) {
      const { confirm } = await inquirer.prompt([
        {
          name: 'confirm',
          type: 'confirm',
          message: [
            chalk.reset(
              `A squid tag "${tag}" has already been assigned to the previous squid deployment ${formatSquidFullname({ org, name, ref: oldSquid.hash })}.`,
            ),
            chalk.reset(`The tag URL will be assigned to the newly created deployment. ${chalk.bold(`Are you sure?`)}`),
          ].join('\n'),
        },
      ]);
      if (!confirm) return;
    }

    const deployment = await tagSquid({
      organization,
      reference,
      data: {
        tag: newTag,
      },
    });
    await this.pollDeploy({ organization, deploy: deployment });
    if (!deployment || !deployment.squid) return;

    this.logDeployResult(
      UPDATE_COLOR,
      `The squid ${formatSquidFullname({
        org: deployment.organization.code,
        name: deployment.squid.name,
        ref: deployment.squid.hash,
      })} has been successfully updated`,
    );
  }
}
