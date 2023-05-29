import inquirer from 'inquirer';

import { listProjects } from '../api/profile';

export async function chooseProjectIfRequired(projectCode?: string) {
  if (projectCode) return projectCode;

  const projects = await listProjects();

  if (projects.length === 0) return;
  else if (projects.length === 1) return projects[0].code;

  const { project } = await inquirer.prompt([
    {
      name: 'project',
      type: 'list',
      message: `Please choose a project:`,
      choices: projects.map((p) => {
        return {
          name: p.name ? `${p.name} (${p.code})` : p.code,
          value: p.code,
        };
      }),
    },
  ]);

  return project.value;
}
