const settings = require("../settings.json");
const SourceJiraApi = require("./sourceJiraApi.js");
const TargetJiraApi = require("./targetJiraApi.js");
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

function parseIssueKey(str) {
  return parseInt(str.replace(/^\D+/g, ""));
}

async function migrateIssues(
  sourceJiraApi,
  issueKeyStart,
  issueKeyEnd,
  isZephyrScale
) {
  var title = isZephyrScale ? "Zephyr Scale" : "Jira";
  var desc = isZephyrScale ? "test case" : "issue";
  var zephyrScaleApi = new TargetJiraApi(settings.targetJira, isZephyrScale);

  console.log(`Validating connection to target ${title}...`);
  if (!(await zephyrScaleApi.validate())) {
    console.log(
      `Error trying to connect to the target ${title} instance. Aborting.`
    );
    return;
  }

  console.log("Creating directory to store downloaded attachments...");
  deleteFolderRecursive("./attachments");
  fs.mkdirSync("./attachments");

  console.log(`All good. Ready to start ${title} migration...\n`);

  var issue;
  let index = 1;
  while ((issue = await zephyrScaleApi.getNextIssue(isZephyrScale))) {
    var issueKey = zephyrScaleApi.getIssueKey(issue, isZephyrScale);
    if (!issueKey) {
      console.log(`\tNo ${desc} key has been found. Skipping...`);
      continue;
    }
    const key = parseIssueKey(issueKey);
    if (key >= issueKeyStart && key <= issueKeyEnd) {
      console.log(`#${index++} ${desc} ${issue.key}:`);
      var attachments = await sourceJiraApi.getAttachments(issueKey);
      if (!attachments.length) {
        console.log(`\tNo attachments to upload from ${desc} ${issueKey}.`);
        continue;
      }
      console.log(
        `\tFound ${attachments.length} attachments. Downloading attachments from ${desc} ${issueKey}...`
      );
      await sourceJiraApi.downloadAttachments(issueKey, attachments);
      console.log(`\tUploading attachments to ${desc} ${issue.key}...`);
      await zephyrScaleApi.uploadAttachments(
        issueKey,
        issue.key,
        isZephyrScale
      );
    }
  }
  console.log(`${title} migration complete!`);
}

async function migrate() {
  var sourceJiraApi = new SourceJiraApi(settings.sourceJira);

  console.log("Validating connection to source Jira...");
  if (!(await sourceJiraApi.validate())) {
    console.log(
      "Error trying to connect to the source Jira instance. Aborting."
    );
    return;
  }

  let issueKeyStart = Number.MIN_SAFE_INTEGER;
  let issueKeyEnd = Number.MAX_SAFE_INTEGER;

  if (settings.sourceJira.issueKeyStart !== "") {
    issueKeyStart = parseIssueKey(settings.sourceJira.issueKeyStart);
  }

  if (settings.sourceJira.issueKeyEnd !== "") {
    issueKeyEnd = parseIssueKey(settings.sourceJira.issueKeyEnd);
  }

  var isZephyrScale = true;
  await migrateIssues(sourceJiraApi, issueKeyStart, issueKeyEnd, isZephyrScale);
  await migrateIssues(
    sourceJiraApi,
    issueKeyStart,
    issueKeyEnd,
    !isZephyrScale
  );
}

migrate();
