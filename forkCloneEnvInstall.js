const readline = require('readline');
const axios = require('axios');
const { execSync, writeFileSync } = require('child_process');
const fs = require('fs');
const chalk = require('chalk');

// Readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// GitHub API credentials
let username;
let token;

// Repository details
let sourceOwner;
let sourceRepo;
let targetOwner;
let targetRepo;

// Path to clone the repository to
let clonePath;

// Environment variables
const envVariables = {};

// Function to prompt for input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(chalk.yellow(question), (answer) => {
      resolve(answer.trim());
    });
  });
}

// Create a fork of the source repository
async function forkRepository() {
  try {
    const response = await axios.post(`https://api.github.com/repos/${sourceOwner}/${sourceRepo}/forks`, null, {
      auth: {
        username,
        password: token
      }
    });

    const forkedRepoFullName = response.data.full_name;

    // Update the repository owner to the target owner
    await axios.patch(`https://api.github.com/repos/${forkedRepoFullName}`, {
      owner: targetOwner
    }, {
      auth: {
        username,
        password: token
      }
    });

    console.log(chalk.green('Forked repository created successfully.'));

    // Clone the forked repository to the specified path
    execSync(`git clone https://github.com/${forkedRepoFullName}.git ${clonePath}`);

    console.log(chalk.green('Repository cloned successfully.'));

    // Create .env file and set up environment variables
    const envPath = `${clonePath}/.env`;
    let envContent = '';

    for (const key in envVariables) {
      const value = envVariables[key];
      envContent += `${key}=${value}\n`;
    }

    writeFileSync(envPath, envContent);

    console.log(chalk.green('.env file created successfully.'));

    // Install dependencies in the cloned repository
    execSync(`cd ${clonePath} && npm install`);

    console.log(chalk.green('Dependencies installed successfully.'));

    rl.close();
  } catch (error) {
    console.error(chalk.red('Error forking repository:'), error.response.data.message);
    rl.close();
  }
}

// Main function
async function main() {
  console.log(chalk.blue('=== Repository Fork and Setup CLI ===\n'));

  // Prompt for GitHub API credentials
  username = await prompt(chalk.cyan('Enter your GitHub username: '));
  token = await prompt(chalk.cyan('Enter your GitHub access token: '));

  // Prompt for repository details
  sourceOwner = await prompt(chalk.cyan('Enter the source repository owner: '));
  sourceRepo = await prompt(chalk.cyan('Enter the source repository name: '));
  targetOwner = await prompt(chalk.cyan('Enter the target repository owner: '));
  targetRepo = await prompt(chalk.cyan('Enter the target repository name: '));

  // Prompt for clone path
  clonePath = await prompt(chalk.cyan('Enter the path to clone the repository to: '));

  // Prompt for environment variables
  console.log(chalk.blue('\nEnter the environment variables:'));
  let moreEnvVars = true;

  while (moreEnvVars) {
    const key = await prompt(chalk.cyan('Variable key (leave empty to finish): '));

    if (key === '') {
      moreEnvVars = false;
      break;
    }

    const value = await prompt(chalk.cyan(`Value for ${key}: `));
    envVariables[key] = value;
  }

  // Start forking and setting up the repository
  forkRepository();
}

// Start the CLI
main();
