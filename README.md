Fork of [SmartBear's tm4j-attachment-migrator](https://bitbucket.org/smartbeartm4j/tm4j-attachment-migrator) to address
a bug with migrating multiple attachments for an issue and add support for migrating attachment for non-test issues.

* * *

# README #
Migrates attachments from Jira issues to test cases in *Zephyr Scale*. The Jira issues where the attachments will be migrated from can be of any type, including Zephyr or Xray test cases.

## Requirements ##
* NodeJs 8.x

## How to use ##
1) Configure the file ``settings.json`` with:

* ``sourceJira``: this is the Jira instance where the images will be exported. The ```url```, ```user``` and ```password``` to connect to it must be provided.
* ``targetJira``: this is the Jira instance where Zephyr Scale is installed and where the images will be imported. Besides the ```url```, ```user``` and ```password``` attributes, you must provide the name of a test case custom field with the issue key for retrieving the attachments and the project key of the test cases.

Both source and target Jira can either be the same or different Jira instances.

Example:
```
{
	"sourceJira": {
		"url": "http://myserver.com/jira",
		"user": "myself",
		"password": "mypass"
	},
	"targetJira": {
		"url": "http://myserver2.com/jira",
		"user": "anotheruser",
		"password": "anotherpass",
		"projectKey": "PROJ",
		"issueKeyCustomField": "Original Issue Key"
	}
}
```

2) Open a terminal window, and navigate to the directory where the repository has been cloned to: ``cd <zephyr-scale-file-converter-dir>``.

3) Install the Javascript dependencies by executing: ``npm install``.

4) Run the migration by executing: ``npm start``.

All the progess will be logged on the console and the images automatically uploaded to Zephyr Scale.