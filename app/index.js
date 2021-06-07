const settings = require("../settings.json");
const SourceJiraApi = require("./sourceJiraApi.js");
const TargetJiraApi = require("./targetJiraApi.js");
const TargetTM4JApi = require("./targetTm4jApi.js");
const fs = require("fs");

function deleteFolderRecursive(path) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function (file, index) {
      var curPath = path + "/" + file;
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
}

async function migrateJira() {
  var sourceJiraApi = new SourceJiraApi(settings.sourceJira);
  var targetJiraApi = new TargetJiraApi(settings.targetJira);

  console.log("Validating connection to source Jira...");
  if (!(await sourceJiraApi.validate())) {
    console.log(
      "Error trying to connect to the source Jira instance. Aborting."
    );
    return;
  }

  console.log("Validating connection to target Jira...");
  if (!(await targetJiraApi.validate())) {
    console.log(
      "Error trying to connect to the target Jira instance. Aborting."
    );
    return;
  }

  console.log("Creating directory to store downloaded attachments...");
  deleteFolderRecursive("./attachments");
  fs.mkdirSync("./attachments");

  console.log("All good. Ready to start Jira migration...\n");

  var issue;
  let index = 1;
  while ((issue = await targetJiraApi.getNextTestCase())) {
    console.log(`#${index++} Issue ${issue.key}:`);
    var issueKey = issue.key;
    if (!issueKey) {
      console.log("\tNo issue key has been found. Skipping...");
      continue;
    }
    var attachments = await sourceJiraApi.getAttachments(issueKey);
    if (!attachments.length) {
      console.log(`\tNo attachments to upload from issue ${issueKey}.`);
      continue;
    }
    console.log(
      `\tFound ${attachments.length} attachments. Downloading attachments from issue ${issueKey}...`
    );
    await sourceJiraApi.downloadAttachments(issueKey, attachments);
    console.log(`\tUploading attachments to issue ${issue.key}...`);
    await targetJiraApi.uploadAttachments(issueKey, issue.key);
  }
  console.log("Jira migration complete!");
}

async function migrateTm4j() {
  var sourceJiraApi = new SourceJiraApi(settings.sourceJira);
  var targetTm4jApi = new TargetTM4JApi(settings.targetJira);

  console.log("Validating connection to source Jira...");
  if (!(await sourceJiraApi.validate())) {
    console.log(
      "Error trying to connect to the source Jira instance. Aborting."
    );
    return;
  }

  console.log("Validating connection to target Jira...");
  if (!(await targetTm4jApi.validate())) {
    console.log(
      "Error trying to connect to the target Jira instance. Aborting."
    );
    return;
  }

  console.log("Creating directory to store downloaded attachments...");
  deleteFolderRecursive("./attachments");
  fs.mkdirSync("./attachments");

  console.log("All good. Ready to start TM4J migration...\n");

  var testCase;
  let index = 1;
  while ((testCase = await targetTm4jApi.getNextTestCase())) {
    console.log(`#${index++} Test case ${testCase.key}:`);
    var issueKey = targetTm4jApi.getIssueKey(testCase);
    if (!issueKey) {
      console.log("\tNo issue key has been found. Skipping...");
      continue;
    }
    var attachments = await sourceJiraApi.getAttachments(issueKey);
    if (!attachments.length) {
      console.log(`\tNo attachments to upload from issue ${issueKey}.`);
      continue;
    }
    console.log(
      `\tFound ${attachments.length} attachments. Downloading attachments from issue ${issueKey}...`
    );
    await sourceJiraApi.downloadAttachments(issueKey, attachments);
    console.log(`\tUploading attachments to test case ${testCase.key}...`);
    await targetTm4jApi.uploadAttachments(issueKey, testCase.key);
  }
  console.log("TM4J migration complete!");
}

async function migrate() {
  await migrateJira();
  await migrateTm4j();
}

migrate();
